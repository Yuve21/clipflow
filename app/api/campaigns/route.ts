import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const PROMO_TYPES = ['product', 'service', 'business', 'music', 'content']
const PAYOUT_MODELS = ['per_post', 'per_1k_views', 'flat']

// POST /api/campaigns — create a campaign (find-or-create the workspace's brand)
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const brandName = typeof body?.brand_name === 'string' ? body.brand_name.trim() : ''
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  if (!brandName) return NextResponse.json({ error: 'Brand name is required' }, { status: 400 })
  if (!title) return NextResponse.json({ error: 'Campaign title is required' }, { status: 400 })

  const promoType = PROMO_TYPES.includes(body?.promo_type) ? body.promo_type : 'product'
  const payoutModel = PAYOUT_MODELS.includes(body?.payout_model) ? body.payout_model : 'per_post'
  const payoutCents = Math.max(0, Math.round(Number(body?.payout_cents) || 0))
  const budgetCents = Math.max(0, Math.round(Number(body?.budget_cents) || 0))
  const categories: string[] = Array.isArray(body?.categories) ? body.categories.slice(0, 15) : []
  const status = body?.status === 'active' ? 'active' : 'draft'

  const admin = createAdminClient()

  // Find or create a brand for this workspace
  const { data: existingBrand } = await admin
    .from('brands').select('id').eq('workspace_id', member.workspace_id).eq('name', brandName).maybeSingle()

  let brandId = existingBrand?.id
  if (!brandId) {
    const { data: newBrand, error: brandErr } = await admin
      .from('brands')
      .insert({
        workspace_id: member.workspace_id,
        name: brandName,
        website: typeof body?.website === 'string' ? body.website.trim() || null : null,
      })
      .select('id').single()
    if (brandErr || !newBrand) {
      return NextResponse.json({ error: brandErr?.message || 'Failed to create brand' }, { status: 500 })
    }
    brandId = newBrand.id
  }

  const { data: campaign, error: campaignErr } = await admin
    .from('campaigns')
    .insert({
      brand_id: brandId,
      title,
      description: typeof body?.description === 'string' ? body.description.trim() || null : null,
      promo_type: promoType,
      payout_model: payoutModel,
      payout_cents: payoutCents,
      budget_cents: budgetCents,
      asset_url: typeof body?.asset_url === 'string' ? body.asset_url.trim() || null : null,
      status,
    })
    .select('id').single()

  if (campaignErr || !campaign) {
    return NextResponse.json({ error: campaignErr?.message || 'Failed to create campaign' }, { status: 500 })
  }

  if (categories.length) {
    await admin.from('campaign_categories').insert(
      categories.map((slug) => ({ campaign_id: campaign.id, category_slug: slug }))
    )
  }

  return NextResponse.json({ campaign_id: campaign.id })
}
