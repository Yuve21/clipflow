import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Verify membership via clip → client → workspace
  const { data: clip } = await supabase
    .from('clips')
    .select('client_id, clients(workspace_id)')
    .eq('id', id)
    .single()

  if (!clip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const wsId = (clip.clients as unknown as { workspace_id: string } | null)?.workspace_id
  const { data: member } = await supabase
    .from('workspace_members').select('id').eq('workspace_id', wsId).eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const allowed = ['status', 'title', 'due_date', 'current_version_id']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  const { data, error } = await admin.from('clips').update(update).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clip: data })
}
