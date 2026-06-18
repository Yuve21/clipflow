import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// PUT /api/clipper-profile — upsert the workspace's discoverable clipper profile
export async function PUT(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const displayName = typeof body?.display_name === 'string' ? body.display_name.trim() : ''
  if (!displayName) return NextResponse.json({ error: 'Display name is required' }, { status: 400 })

  const categories: string[] = Array.isArray(body?.categories) ? body.categories.slice(0, 15) : []
  const wsId = member.workspace_id
  const admin = createAdminClient()

  const { error: upsertErr } = await admin.from('clipper_profiles').upsert({
    workspace_id: wsId,
    display_name: displayName,
    bio: typeof body?.bio === 'string' ? body.bio.trim() || null : null,
    is_listed: !!body?.is_listed,
    min_rate_cents: body?.min_rate_cents != null ? Math.max(0, Math.round(Number(body.min_rate_cents))) : null,
  })
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  // Replace category set
  await admin.from('clipper_categories').delete().eq('workspace_id', wsId)
  if (categories.length) {
    await admin.from('clipper_categories').insert(
      categories.map((slug) => ({ workspace_id: wsId, category_slug: slug }))
    )
  }

  return NextResponse.json({ ok: true })
}
