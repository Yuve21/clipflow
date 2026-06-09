import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, after } from 'next/server'
import { cutSuggestion } from '@/lib/ai-clipper/cut'

export const maxDuration = 300

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()

  const { data: suggestion } = await supabase
    .from('ai_clip_suggestions')
    .select('id, workspace_id, cut_status')
    .eq('id', id)
    .single()

  if (!suggestion || suggestion.workspace_id !== member?.workspace_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (suggestion.cut_status === 'cutting') {
    return NextResponse.json({ error: 'Already cutting' }, { status: 409 })
  }
  if (suggestion.cut_status === 'done') {
    return NextResponse.json({ error: 'Already cut' }, { status: 409 })
  }

  const admin = createAdminClient()
  await admin.from('ai_clip_suggestions').update({ cut_status: 'cutting' }).eq('id', id)

  after(async () => {
    try {
      await cutSuggestion(id)
    } catch (err) {
      console.error('[AI Clipper] cutSuggestion threw:', err)
    }
  })

  return NextResponse.json({ suggestion_id: id })
}
