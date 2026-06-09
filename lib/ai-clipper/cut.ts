import { createAdminClient } from '@/lib/supabase/admin'
import ffmpeg from 'fluent-ffmpeg'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
ffmpeg.setFfmpegPath(ffmpegInstaller.path)

export async function cutSuggestion(suggestionId: string) {
  const admin = createAdminClient()

  const { data: suggestion } = await admin
    .from('ai_clip_suggestions')
    .select('*, ai_jobs(video_path, workspace_id, client_id)')
    .eq('id', suggestionId)
    .single()

  if (!suggestion) throw new Error('Suggestion not found')

  const job = suggestion.ai_jobs as { video_path: string; workspace_id: string; client_id: string | null }
  const tmpDir = path.join(os.tmpdir(), `clipflow-cut-${suggestionId}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  try {
    // Download source video
    const sourceVideoPath = path.join(tmpDir, 'source.mp4')
    const { data: fileData, error: dlError } = await admin.storage
      .from('ai-source-videos')
      .download(job.video_path)

    if (dlError || !fileData) throw new Error(`Download failed: ${dlError?.message}`)
    fs.writeFileSync(sourceVideoPath, Buffer.from(await fileData.arrayBuffer()))

    // Cut the clip
    const outputPath = path.join(tmpDir, 'clip.mp4')
    const startTime = Number(suggestion.start_time)
    const duration = Number(suggestion.end_time) - startTime

    await cutVideo(sourceVideoPath, outputPath, startTime, duration)
    fs.rmSync(sourceVideoPath, { force: true })

    // Upload to Supabase Storage
    const storagePath = `${job.workspace_id}/${suggestion.job_id}/${suggestionId}.mp4`
    const fileBuffer = fs.readFileSync(outputPath)

    const { error: uploadError } = await admin.storage
      .from('ai-cut-clips')
      .upload(storagePath, fileBuffer, { contentType: 'video/mp4', upsert: true })

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    // Get a long-lived signed URL (7 days)
    const { data: urlData } = await admin.storage
      .from('ai-cut-clips')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7)

    const outputUrl = urlData?.signedUrl ?? null

    // Create a clips record
    const { data: clip } = await admin
      .from('clips')
      .insert({
        client_id: job.client_id,
        title: suggestion.title,
        status: 'ready',
      })
      .select()
      .single()

    // Create a clip_version record pointing to the cut file
    if (clip) {
      const { data: version } = await admin
        .from('clip_versions')
        .insert({
          clip_id: clip.id,
          version_no: 1,
          file_url: outputUrl,
        })
        .select()
        .single()

      if (version) {
        await admin
          .from('clips')
          .update({ current_version_id: version.id })
          .eq('id', clip.id)
      }
    }

    // Update suggestion
    await admin.from('ai_clip_suggestions').update({
      cut_status: 'done',
      output_path: storagePath,
      clip_id: clip?.id ?? null,
    }).eq('id', suggestionId)

  } catch (err) {
    await admin.from('ai_clip_suggestions').update({
      cut_status: 'error',
      cut_error: err instanceof Error ? err.message : String(err),
    }).eq('id', suggestionId)
    throw err
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

function cutVideo(inputPath: string, outputPath: string, startSec: number, durationSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(startSec)
      .duration(durationSec)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-preset fast', '-crf 23', '-movflags +faststart'])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run()
  })
}
