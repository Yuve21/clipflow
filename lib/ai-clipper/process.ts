import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'
import ffmpeg from 'fluent-ffmpeg'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Dynamically require to avoid webpack bundling issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
ffmpeg.setFfmpegPath(ffmpegInstaller.path)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const WHISPER_MAX_BYTES = 24 * 1024 * 1024 // 24MB (leave 1MB headroom)
const AUDIO_CHUNK_SECONDS = 1200 // 20 min chunks for chunked transcription

interface Segment {
  start: number
  end: number
  text: string
}

interface ClipSuggestion {
  title: string
  start_time: number
  end_time: number
  viral_score: number
  hook: string
  reason: string
}

export async function processAiJob(jobId: string) {
  const admin = createAdminClient()

  const { data: job } = await admin
    .from('ai_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (!job) return

  const tmpDir = path.join(os.tmpdir(), `clipflow-ai-${jobId}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  try {
    // Step 1: download source video
    await admin.from('ai_jobs').update({ status: 'processing' }).eq('id', jobId)

    const sourceVideoPath = path.join(tmpDir, 'source.mp4')
    await downloadFromStorage('ai-source-videos', job.video_path, sourceVideoPath)

    // Step 2: extract compressed audio
    const audioPath = path.join(tmpDir, 'audio.mp3')
    await extractAudio(sourceVideoPath, audioPath)

    // Free up tmp space — delete source video before transcribing
    fs.rmSync(sourceVideoPath, { force: true })

    // Step 3: transcribe (chunk if needed)
    const segments = await transcribeAudio(audioPath, tmpDir)
    fs.rmSync(audioPath, { force: true })

    // Step 4: GPT-4o viral analysis
    const suggestions = await analyzeForViralMoments(segments, {
      maxClips: job.max_clips,
      minDuration: job.min_duration_s,
      maxDuration: job.max_duration_s,
    })

    // Step 5: persist suggestions
    if (suggestions.length > 0) {
      await admin.from('ai_clip_suggestions').insert(
        suggestions.map(s => ({
          job_id: jobId,
          workspace_id: job.workspace_id,
          title: s.title,
          start_time: s.start_time,
          end_time: s.end_time,
          viral_score: s.viral_score,
          hook: s.hook,
          reason: s.reason,
        }))
      )
    }

    await admin.from('ai_jobs').update({
      status: 'done',
      completed_at: new Date().toISOString(),
    }).eq('id', jobId)

  } catch (err) {
    console.error(`[AI Job ${jobId}] Error:`, err)
    await admin.from('ai_jobs').update({
      status: 'error',
      error_message: err instanceof Error ? err.message : String(err),
    }).eq('id', jobId)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

async function downloadFromStorage(bucket: string, storagePath: string, destPath: string) {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(bucket).download(storagePath)
  if (error || !data) throw new Error(`Storage download failed: ${error?.message}`)
  const buf = Buffer.from(await data.arrayBuffer())
  fs.writeFileSync(destPath, buf)
}

function extractAudio(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('64k')
      .audioChannels(1)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run()
  })
}

async function transcribeAudio(audioPath: string, tmpDir: string): Promise<Segment[]> {
  const stats = fs.statSync(audioPath)

  if (stats.size <= WHISPER_MAX_BYTES) {
    // Single-pass transcription
    const file = fs.createReadStream(audioPath)
    const result = await openai.audio.transcriptions.create({
      file: file as Parameters<typeof openai.audio.transcriptions.create>[0]['file'],
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })
    return (result.segments ?? []) as Segment[]
  }

  // Chunked transcription for large audio files
  const audioDuration = await getAudioDuration(audioPath)
  const allSegments: Segment[] = []
  let offset = 0

  while (offset < audioDuration) {
    const chunkDuration = Math.min(AUDIO_CHUNK_SECONDS, audioDuration - offset)
    const chunkPath = path.join(tmpDir, `chunk_${offset}.mp3`)

    await extractAudioChunk(audioPath, chunkPath, offset, chunkDuration)

    const file = fs.createReadStream(chunkPath)
    const result = await openai.audio.transcriptions.create({
      file: file as Parameters<typeof openai.audio.transcriptions.create>[0]['file'],
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })

    const segments = (result.segments ?? []) as Segment[]
    // Offset timestamps
    allSegments.push(...segments.map(s => ({
      start: s.start + offset,
      end: s.end + offset,
      text: s.text,
    })))

    fs.rmSync(chunkPath, { force: true })
    offset += chunkDuration
  }

  return allSegments
}

function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, meta) => {
      if (err) reject(err)
      else resolve(meta.format.duration ?? 0)
    })
  })
}

function extractAudioChunk(inputPath: string, outputPath: string, startSec: number, durationSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(startSec)
      .duration(durationSec)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('64k')
      .audioChannels(1)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run()
  })
}

async function analyzeForViralMoments(
  segments: Segment[],
  filters: { maxClips: number; minDuration: number; maxDuration: number }
): Promise<ClipSuggestion[]> {
  if (segments.length === 0) return []

  const transcriptText = segments
    .map(s => `[${formatTime(s.start)} - ${formatTime(s.end)}] ${s.text.trim()}`)
    .join('\n')

  const system = `You are an expert viral short-form content analyst for TikTok, Instagram Reels, and YouTube Shorts.

Analyze the transcript below and identify the ${filters.maxClips} BEST moments for viral short-form clips.

Rules:
- Each clip must be between ${filters.minDuration}s and ${filters.maxDuration}s long
- Clip boundaries must align with sentence/thought boundaries in the transcript
- Prioritize: emotional peaks, surprising reveals, hot takes, funny reactions, quotable statements, controversy, unexpected moments
- start_time and end_time are in SECONDS (e.g. 125.5 means 2 minutes 5.5 seconds)
- viral_score: 1–100 (80+ = highly viral, 50–79 = good, below 50 = weak — don't include weak ones)
- hook: the attention-grabbing caption text for the first 2 seconds on screen
- reason: 1-2 sentences explaining why this specific moment will perform well

Return ONLY a valid JSON object — no markdown, no explanation:
{"clips":[{"title":"...","start_time":0,"end_time":60,"viral_score":85,"hook":"...","reason":"..."}]}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `TRANSCRIPT:\n${transcriptText}` },
    ],
  })

  const raw = response.choices[0].message.content ?? '{}'
  const parsed = JSON.parse(raw) as { clips?: ClipSuggestion[] }
  return (parsed.clips ?? []).filter(c =>
    typeof c.start_time === 'number' &&
    typeof c.end_time === 'number' &&
    c.end_time > c.start_time &&
    c.viral_score >= 50
  )
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
