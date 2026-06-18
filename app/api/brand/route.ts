import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// PUT /api/brand — upsert the workspace's brand profile (find-or-create by the
// workspace's single primary brand). Sets categories that power the directory filter.
export async function PUT(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Brand name is required' }, { status: 400 })

  const categories: string[] = Array.isArray(body?.categories) ? body.categories.slice(0, 15) : []
  const wsId = member.workspace_id
  const admin = createAdminClient()

  const fields = {
    name,
    tagline: typeof body?.tagline === 'string' ? body.tagline.trim() || null : null,
    website: typeof body?.website === 'string' ? body.website.trim() || null : null,
    description: typeof body?.description === 'string' ? body.description.trim() || null : null,
    logo_url: typeof body?.logo_url === 'string' ? body.logo_url.trim() || null : null,
    is_listed: body?.is_listed !== false,
  }

  // One primary brand per workspace for now: update the earliest, else insert.
  const { data: existing } = await admin
    .from('brands').select('id').eq('workspace_id', wsId).order('created_at', { ascending: true }).limit(1).maybeSingle()

  let brandId = existing?.id
  if (brandId) {
    const { error } = await admin.from('brands').update(fields).eq('id', brandId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { data: created, error } = await admin
      .from('brands').insert({ workspace_id: wsId, ...fields }).select('id').single()
    if (error || !created) return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
    brandId = created.id
  }

  await admin.from('brand_categories').delete().eq('brand_id', brandId)
  if (categories.length) {
    await admin.from('brand_categories').insert(
      categories.map((slug) => ({ brand_id: brandId, category_slug: slug }))
    )
  }

  return NextResponse.json({ brand_id: brandId })
}
