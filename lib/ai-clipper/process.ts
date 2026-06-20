import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'
import ffmpeg from 'fluent-ffmpeg'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { analyzeAudioEnergy, scoreClipEnergy } from './audio-energy'
import { extractFrames, scoreVisually } from './visual-score'
import { MAX_SOURCE_SECONDS, estimateJobCostCents } from '@/lib/credits'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
ffmpeg.setFfmpegPath(ffmpegInstaller.path)

const WHISPER_MAX_BYTES = 24 * 1024 * 1024
const AUDIO_CHUNK_SECONDS = 1200

// Composite score weights (must sum to 1.0)
const W_TEXT = 0.55
const W_VISUAL = 0.35
const W_AUDIO = 0.10

interface Segment {
  start: number
  end: number
  text: string
}

interface ClipSuggestion {
  title: string
  start_time: number
  end_time: number
  viral_score: number // text-based score from GPT-4o; renamed to text_score after combining
  hook: string
  reason: string
}

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
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

  // Track whether we've spent money on OpenAI yet. If the job fails before this,
  // we refund the credit consumed at job start.
  let paidApiStarted = false

  try {
    await admin.from('ai_jobs').update({ status: 'processing' }).eq('id', jobId)

    // ── Step 1: Download source video ────────────────────────────────────────
    const sourceVideoPath = path.join(tmpDir, 'source.mp4')
    await downloadFromStorage('ai-source-videos', job.video_path, sourceVideoPath)

    // ── Step 2: Extract audio ─────────────────────────────────────────────────
    const audioPath = path.join(tmpDir, 'audio.mp3')
    await extractAudio(sourceVideoPath, audioPath)

    // ── Step 2b: Enforce source-length cap (bounds cost + the 300s timeout) ────
    const audioDuration = await getAudioDuration(audioPath)
    if (audioDuration > MAX_SOURCE_SECONDS) {
      // Refund the credit — no paid API call has happened yet.
      await admin.rpc('add_ai_credits', { p_workspace_id: job.workspace_id, p_amount: 1 })
      await admin.from('ai_jobs').update({
        status: 'error',
        error_message: `Video is ${Math.round(audioDuration / 60)} min, over the ${Math.round(MAX_SOURCE_SECONDS / 60)} min limit. Your credit was refunded.`,
      }).eq('id', jobId)
      return
    }

    // ── Step 3: Audio energy profile (podcast signal) ─────────────────────────
    // Run in parallel with frame extraction — both need tmpDir, no shared state
    const [energyMap, frames] = await Promise.all([
      analyzeAudioEnergy(audioPath, tmpDir),
      extractFrames(sourceVideoPath, tmpDir).catch(err => {
        // Video-only signal — audio-only files have no video stream; non-fatal
        console.warn('[ProcessAiJob] Frame extraction skipped:', err.message)
        return []
      }),
    ])

    // ── Step 4: Free space — source video no longer needed ────────────────────
    fs.rmSync(sourceVideoPath, { force: true })

    // ── Step 5: Transcribe (first paid API call) ──────────────────────────────
    paidApiStarted = true
    const segments = await transcribeAudio(audioPath, tmpDir)
    fs.rmSync(audioPath, { force: true })

    // ── Step 6: GPT-4o text analysis → text scores ───────────────────────────
    const { suggestions: textSuggestions, inputTokens: gptInputTokens, outputTokens: gptOutputTokens } =
      await analyzeForViralMoments(segments, {
        maxClips: job.max_clips,
        minDuration: job.min_duration_s,
        maxDuration: job.max_duration_s,
      })

    // Record usage + estimated cost for margin analytics (non-fatal)
    await recordUsage(admin, {
      workspaceId: job.workspace_id,
      jobId,
      sourceSeconds: audioDuration,
      gptInputTokens,
      gptOutputTokens,
    })

    if (textSuggestions.length === 0) {
      await admin.from('ai_jobs').update({
        status: 'done',
        completed_at: new Date().toISOString(),
      }).eq('id', jobId)
      return
    }

    // ── Step 7: Visual scoring via GPT-4o Vision ──────────────────────────────
    const visualScores = await scoreVisually(frames, textSuggestions, getOpenAI())

    // ── Step 8: Combine all three signals ─────────────────────────────────────
    const enriched = textSuggestions.map((s, i) => {
      const textScore = s.viral_score
      const audioScore = scoreClipEnergy(energyMap, s.start_time, s.end_time)
      const vs = visualScores.find(v => v.suggestionIndex === i)
      const visualScore = vs?.visual_score ?? 50
      const visualAnalysis = vs?.visual_analysis ?? ''

      const composite = Math.round(textScore * W_TEXT + visualScore * W_VISUAL + audioScore * W_AUDIO)

      return {
        job_id: jobId,
        workspace_id: job.workspace_id,
        title: s.title,
        start_time: s.start_time,
        end_time: s.end_time,
        viral_score: Math.max(1, Math.min(100, composite)),
        text_score: textScore,
        audio_score: audioScore,
        visual_score: visualScore,
        visual_analysis: visualAnalysis,
        hook: s.hook,
        reason: s.reason,
      }
    })

    // ── Step 9: Persist ───────────────────────────────────────────────────────
    await admin.from('ai_clip_suggestions').insert(enriched)

    await admin.from('ai_jobs').update({
      status: 'done',
      completed_at: new Date().toISOString(),
    }).eq('id', jobId)

  } catch (err) {
    console.error(`[AI Job ${jobId}] Error:`, err)
    // Refund the credit if we failed before spending anything on OpenAI.
    if (!paidApiStarted) {
      await admin.rpc('add_ai_credits', { p_workspace_id: job.workspace_id, p_amount: 1 })
        .then(() => {}, () => {})
    }
    await admin.from('ai_jobs').update({
      status: 'error',
      error_message: err instanceof Error ? err.message : String(err),
    }).eq('id', jobId)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function downloadFromStorage(bucket: string, storagePath: string, destPath: string) {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(bucket).download(storagePath)
  if (error || !data) throw new Error(`Storage download failed: ${error?.message}`)
  fs.writeFileSync(destPath, Buffer.from(await data.arrayBuffer()))
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
    const file = fs.createReadStream(audioPath)
    const result = await getOpenAI().audio.transcriptions.create({
      file: file as Parameters<OpenAI['audio']['transcriptions']['create']>[0]['file'],
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })
    return (result.segments ?? []) as Segment[]
  }

  const audioDuration = await getAudioDuration(audioPath)
  const allSegments: Segment[] = []
  let offset = 0

  while (offset < audioDuration) {
    const chunkDuration = Math.min(AUDIO_CHUNK_SECONDS, audioDuration - offset)
    const chunkPath = path.join(tmpDir, `chunk_${offset}.mp3`)

    await extractAudioChunk(audioPath, chunkPath, offset, chunkDuration)

    const file = fs.createReadStream(chunkPath)
    const result = await getOpenAI().audio.transcriptions.create({
      file: file as Parameters<OpenAI['audio']['transcriptions']['create']>[0]['file'],
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })

    allSegments.push(
      ...(result.segments ?? [] as Segment[]).map((s: Segment) => ({
        start: s.start + offset,
        end: s.end + offset,
        text: s.text,
      }))
    )

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
): Promise<{ suggestions: ClipSuggestion[]; inputTokens: number; outputTokens: number }> {
  if (segments.length === 0) return { suggestions: [], inputTokens: 0, outputTokens: 0 }

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
- viral_score: 1–100 text-only score (80+ = highly viral, 50–79 = good — omit anything below 50)
- hook: the attention-grabbing caption text for the first 2 seconds on screen
- reason: 1-2 sentences explaining why this moment will perform well

Return ONLY valid JSON — no markdown:
{"clips":[{"title":"...","start_time":0,"end_time":60,"viral_score":85,"hook":"...","reason":"..."}]}`

  const response = await getOpenAI().chat.completions.create({
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
  const suggestions = (parsed.clips ?? []).filter(c =>
    typeof c.start_time === 'number' &&
    typeof c.end_time === 'number' &&
    c.end_time > c.start_time &&
    c.viral_score >= 50
  )
  return {
    suggestions,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  }
}

// Write a usage/cost row for one job. Best-effort — never throws into the pipeline.
async function recordUsage(
  admin: ReturnType<typeof createAdminClient>,
  opts: { workspaceId: string; jobId: string; sourceSeconds: number; gptInputTokens: number; gptOutputTokens: number }
) {
  try {
    const estCents = estimateJobCostCents({
      sourceSeconds: opts.sourceSeconds,
      gptInputTokens: opts.gptInputTokens,
      gptOutputTokens: opts.gptOutputTokens,
    })
    await admin.from('ai_usage_events').insert({
      workspace_id: opts.workspaceId,
      job_id: opts.jobId,
      source_seconds: Math.round(opts.sourceSeconds * 100) / 100,
      whisper_minutes: Math.round((opts.sourceSeconds / 60) * 100) / 100,
      gpt_input_tokens: opts.gptInputTokens,
      gpt_output_tokens: opts.gptOutputTokens,
      est_cost_cents: Math.round(estCents * 10000) / 10000,
      credits_charged: 1,
    })
  } catch (e) {
    console.warn(`[AI Job ${opts.jobId}] usage metering failed:`, e)
  }
}

// Self-healing: jobs run in a 300s serverless window via after(); if one times out
// it can be stranded in 'processing' forever with the user's credit already spent.
// Called opportunistically when a workspace views its jobs — marks timed-out jobs as
// errored and refunds the credit. Idempotent: the conditional update guarantees a
// single processing→error transition, so a credit is refunded at most once.
const PROCESSING_TIMEOUT_MS = 15 * 60 * 1000 // generous vs the 300s cap
const UPLOAD_TIMEOUT_MS = 60 * 60 * 1000

export async function reapStuckJobs(workspaceId: string) {
  const admin = createAdminClient()
  const now = Date.now()

  // Timed-out processing jobs → error + refund (a credit was consumed at start).
  const { data: stuck } = await admin
    .from('ai_jobs')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'processing')
    .lt('created_at', new Date(now - PROCESSING_TIMEOUT_MS).toISOString())

  for (const j of stuck ?? []) {
    const { data: flipped } = await admin
      .from('ai_jobs')
      .update({ status: 'error', error_message: 'Timed out while processing — your credit was refunded.' })
      .eq('id', j.id)
      .eq('status', 'processing')
      .select('id')
    if (flipped && flipped.length) {
      await admin.rpc('add_ai_credits', { p_workspace_id: workspaceId, p_amount: 1 })
    }
  }

  // Abandoned uploads (never started) → error, no refund (no credit was consumed).
  await admin
    .from('ai_jobs')
    .update({ status: 'error', error_message: 'Upload never completed.' })
    .eq('workspace_id', workspaceId)
    .eq('status', 'uploading')
    .lt('created_at', new Date(now - UPLOAD_TIMEOUT_MS).toISOString())
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
