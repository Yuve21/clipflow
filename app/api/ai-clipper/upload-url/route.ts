import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { filename, content_type, client_id } = await req.json()

  // Validate file extension at API layer
  const ALLOWED_EXTENSIONS = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v']
  const fileExt = (filename?.split('.').pop() ?? '').toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
    return NextResponse.json({ error: 'Invalid file type. Allowed: mp4, mov, avi, webm, mkv' }, { status: 400 })
  }

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

  // Usage-based: require at least one AI credit before issuing an upload URL.
  // The credit is actually consumed when the job starts (jobs POST).
  const { data: workspace } = await supabase
    .from('workspaces').select('ai_credits').eq('id', member.workspace_id).single()

  if (!workspace || workspace.ai_credits < 1) {
    return NextResponse.json(
      { error: 'You are out of AI credits. Buy a credit pack to run the AI Clipper.', code: 'no_credits' },
      { status: 402 }
    )
  }

  const admin = createAdminClient()

  // Create the job row first (in 'uploading' state) to get its ID for the storage path
  const { data: job, error: jobError } = await admin
    .from('ai_jobs')
    .insert({
      workspace_id: member.workspace_id,
      client_id: client_id || null,
      video_path: 'pending', // will be updated after we have the jobId
      video_filename: filename,
      status: 'uploading',
    })
    .select()
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message || 'Failed to create job' }, { status: 500 })
  }

  const ext = filename.split('.').pop() ?? 'mp4'
  const storagePath = `${member.workspace_id}/${job.id}/source.${ext}`

  // Update the job with the real storage path
  await admin.from('ai_jobs').update({ video_path: storagePath }).eq('id', job.id)

  // Generate signed upload URL (valid for 120s)
  const { data: uploadData, error: signedError } = await admin.storage
    .from('ai-source-videos')
    .createSignedUploadUrl(storagePath)

  if (signedError || !uploadData) {
    await admin.from('ai_jobs').delete().eq('id', job.id)
    return NextResponse.json({ error: signedError?.message || 'Failed to create upload URL' }, { status: 500 })
  }

  return NextResponse.json({
    job_id: job.id,
    upload_url: uploadData.signedUrl,
    token: uploadData.token,
    path: storagePath,
  })
}
