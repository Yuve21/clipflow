import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()

  const { data: job } = await supabase
    .from('ai_jobs')
    .select('*, clients(name)')
    .eq('id', id)
    .eq('workspace_id', member?.workspace_id)
    .single()

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: suggestions } = await supabase
    .from('ai_clip_suggestions')
    .select('*')
    .eq('job_id', id)
    .order('viral_score', { ascending: false })

  return NextResponse.json({ job, suggestions: suggestions ?? [] })
}
