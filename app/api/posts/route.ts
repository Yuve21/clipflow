import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clip_id, posting_account_id, url, views } = await req.json()

  // Verify access
  const { data: clip } = await supabase
    .from('clips').select('client_id, clients(workspace_id)').eq('id', clip_id).single()
  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  const wsId = (clip.clients as unknown as { workspace_id: string } | null)?.workspace_id
  const { data: member } = await supabase
    .from('workspace_members').select('id').eq('workspace_id', wsId).eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  // Create the post record
  const { data: post, error } = await admin.from('posts').insert({
    clip_id,
    posting_account_id,
    url: url || null,
    views: views || null,
    posted_at: new Date().toISOString(),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-move clip to posted
  await admin.from('clips').update({ status: 'posted' }).eq('id', clip_id)

  return NextResponse.json({ post })
}
