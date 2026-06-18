import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, after } from 'next/server'
import { processAiJob } from '@/lib/ai-clipper/process'

export const maxDuration = 300

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ jobs: [] })

  const { data: jobs } = await supabase
    .from('ai_jobs')
    .select('*, clients(name)')
    .eq('workspace_id', member.workspace_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ jobs: jobs ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { job_id, max_clips, min_duration_s, max_duration_s } = await req.json()

  if (!job_id) return NextResponse.json({ error: 'job_id required' }, { status: 400 })

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  const admin = createAdminClient()

  // Verify job belongs to this workspace
  const { data: job } = await admin
    .from('ai_jobs').select('id, workspace_id, status').eq('id', job_id).single()

  if (!job || job.workspace_id !== member?.workspace_id) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  if (job.status !== 'uploading') {
    return NextResponse.json({ error: 'Job already processing' }, { status: 409 })
  }

  // Usage-based billing: atomically consume one AI credit. A credit is refunded
  // inside processAiJob if the job fails before any paid API call (e.g. too long).
  const { data: consumed, error: consumeError } = await admin
    .rpc('consume_ai_credit', { p_workspace_id: member.workspace_id })
  if (consumeError) {
    return NextResponse.json({ error: 'Could not reserve a credit' }, { status: 500 })
  }
  if (!consumed) {
    return NextResponse.json(
      { error: 'You are out of AI credits. Buy a credit pack to run the AI Clipper.', code: 'no_credits' },
      { status: 402 }
    )
  }

  // Save filters
  await admin.from('ai_jobs').update({
    max_clips: max_clips ?? 10,
    min_duration_s: min_duration_s ?? 30,
    max_duration_s: max_duration_s ?? 90,
    status: 'processing',
  }).eq('id', job_id)

  // Fire processing in background — continues after response returns
  after(async () => {
    try {
      await processAiJob(job_id)
    } catch (err) {
      console.error('[AI Clipper] processAiJob threw outside handler:', err)
    }
  })

  return NextResponse.json({ job_id })
}
