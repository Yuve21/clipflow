import ffmpeg from 'fluent-ffmpeg'
import * as fs from 'fs'
import * as path from 'path'
import OpenAI from 'openai'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
ffmpeg.setFfmpegPath(ffmpegInstaller.path)

const FRAME_INTERVAL_S = 10 // 1 frame per 10 seconds
const FRAME_W = 640
const FRAME_H = 360
const BATCH_SIZE = 4 // suggestions per GPT-4o Vision call

export interface FrameData {
  timestamp: number
  framePath: string
}

export interface VisualScore {
  suggestionIndex: number
  visual_score: number
  visual_analysis: string
}

/**
 * Extract one JPEG frame every FRAME_INTERVAL_S seconds from the source video.
 * Frames are written to {tmpDir}/frames/ and returned as an indexed list.
 * Rejects if the video has no video stream (audio-only) — callers should catch.
 */
export function extractFrames(videoPath: string, tmpDir: string): Promise<FrameData[]> {
  const framesDir = path.join(tmpDir, 'frames')
  fs.mkdirSync(framesDir, { recursive: true })

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .videoFilters([
        `fps=1/${FRAME_INTERVAL_S}`,
        `scale=${FRAME_W}:${FRAME_H}:force_original_aspect_ratio=decrease`,
        `pad=${FRAME_W}:${FRAME_H}:(ow-iw)/2:(oh-ih)/2:black`,
      ])
      .outputOptions(['-q:v', '5'])
      .output(path.join(framesDir, 'frame_%05d.jpg'))
      .on('end', () => {
        const files = fs.readdirSync(framesDir)
          .filter(f => f.endsWith('.jpg'))
          .sort()
        resolve(
          files.map((f, i) => ({
            timestamp: i * FRAME_INTERVAL_S,
            framePath: path.join(framesDir, f),
          }))
        )
      })
      .on('error', reject)
      .run()
  })
}

/**
 * Use GPT-4o Vision to score each suggestion's visual virality.
 * For each suggestion we pick 2 representative frames (start region + midpoint).
 * Runs FRAME_INTERVAL_S-second resolution lookups against pre-extracted frames.
 */
export async function scoreVisually(
  frames: FrameData[],
  suggestions: Array<{ start_time: number; end_time: number; title: string }>,
  openai: OpenAI
): Promise<VisualScore[]> {
  if (frames.length === 0) {
    return suggestions.map((_, i) => ({
      suggestionIndex: i,
      visual_score: 50,
      visual_analysis: 'No video frames available for visual analysis.',
    }))
  }

  // For each suggestion pick 2 de-duped frames closest to start+5s and midpoint
  const nearest = (target: number) =>
    frames.reduce((best, f) =>
      Math.abs(f.timestamp - target) < Math.abs(best.timestamp - target) ? f : best
    )

  const suggestionFrames = suggestions.map((s, i) => {
    const mid = (s.start_time + s.end_time) / 2
    const f1 = nearest(s.start_time + 5)
    const f2 = nearest(mid)
    const unique = f1.framePath === f2.framePath ? [f1] : [f1, f2]
    return { index: i, title: s.title, duration: Math.round(s.end_time - s.start_time), frames: unique }
  })

  const results: VisualScore[] = []

  for (let b = 0; b < suggestionFrames.length; b += BATCH_SIZE) {
    const batch = suggestionFrames.slice(b, b + BATCH_SIZE)

    const imageContent: OpenAI.Chat.ChatCompletionContentPartImage[] = batch.flatMap(s =>
      s.frames.map(f => ({
        type: 'image_url' as const,
        image_url: {
          url: `data:image/jpeg;base64,${fs.readFileSync(f.framePath).toString('base64')}`,
          detail: 'low' as const,
        },
      }))
    )

    const labelText = batch
      .map(s => `Clip index=${s.index} "${s.title}" (${s.duration}s) — ${s.frames.length} frame(s) below`)
      .join('\n')

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a viral short-form content specialist for TikTok, Instagram Reels, and YouTube Shorts.

Analyze each set of video frames and rate the VISUAL virality potential (1–100) based on:
- Facial expressions: visible emotions (excitement, surprise, intensity, laughter)
- Eye contact: is the speaker looking directly at camera? (high-virality signal)
- Body language: hand gestures, posture energy, animated movement
- Composition: engaging framing, text overlays, graphics, production quality
- Visual dynamism: anything that stops the scroll

Return ONLY valid JSON — no markdown:
{"clips":[{"index":0,"visual_score":82,"visual_analysis":"Speaker is mid-laugh with wide eyes and hands raised — strong emotional peak..."}]}`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Rate these ${batch.length} clip(s) visually:\n${labelText}` },
              ...imageContent,
            ],
          },
        ],
      })

      const raw = response.choices[0].message.content ?? '{}'
      const parsed = JSON.parse(raw) as {
        clips?: Array<{ index: number; visual_score: number; visual_analysis: string }>
      }

      for (const clip of parsed.clips ?? []) {
        if (batch.find(s => s.index === clip.index)) {
          results.push({
            suggestionIndex: clip.index,
            visual_score: Math.max(1, Math.min(100, Math.round(clip.visual_score))),
            visual_analysis: clip.visual_analysis ?? '',
          })
        }
      }
    } catch (err) {
      console.warn('[VisualScore] Batch failed (non-fatal):', err instanceof Error ? err.message : err)
      for (const s of batch) {
        results.push({ suggestionIndex: s.index, visual_score: 50, visual_analysis: 'Visual analysis unavailable.' })
      }
    }
  }

  // Fill any gaps
  for (let i = 0; i < suggestions.length; i++) {
    if (!results.find(r => r.suggestionIndex === i)) {
      results.push({ suggestionIndex: i, visual_score: 50, visual_analysis: 'Visual analysis unavailable.' })
    }
  }

  return results
}
