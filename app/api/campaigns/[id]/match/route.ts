import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { MATCH_COST_CREDITS } from '@/lib/credits'

// POST /api/campaigns/[id]/match — spend a credit to rank listed clippers by
// how well they fit this campaign (niche overlap + reach + click performance).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  const wsId = member.workspace_id
  const admin = createAdminClient()

  // Must own the campaign.
  const { data: campaign } = await admin
    .from('campaigns').select('id, brands(workspace_id), campaign_categories(category_slug)').eq('id', campaignId).single()
  const c = campaign as unknown as {
    brands: { workspace_id: string }
    campaign_categories: { category_slug: string }[]
  } | null
  if (!c || c.brands?.workspace_id !== wsId) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Charge a credit before running the match.
  const { data: charged, error: chargeErr } = await admin
    .rpc('consume_ai_credits', { p_workspace_id: wsId, p_n: MATCH_COST_CREDITS })
  if (chargeErr) return NextResponse.json({ error: 'Could not charge credits' }, { status: 500 })
  if (!charged) {
    return NextResponse.json(
      { error: `Matching costs ${MATCH_COST_CREDITS} credit — buy more to run it.`, code: 'no_credits' },
      { status: 402 }
    )
  }

  const campaignCats = new Set(c.campaign_categories.map((x) => x.category_slug))

  // Candidate clippers: listed profiles (excluding the brand's own workspace).
  const { data: profiles } = await admin
    .from('clipper_profiles')
    .select('workspace_id, display_name, bio, total_followers')
    .eq('is_listed', true)
    .neq('workspace_id', wsId)

  const candidates = profiles ?? []
  const ids = candidates.map((p) => p.workspace_id)

  // Their niches + click performance.
  const [{ data: cats }, { data: parts }, { data: labels }] = await Promise.all([
    ids.length ? admin.from('clipper_categories').select('workspace_id, category_slug').in('workspace_id', ids) : Promise.resolve({ data: [] }),
    ids.length ? admin.from('campaign_participations').select('clipper_workspace_id, click_count').in('clipper_workspace_id', ids) : Promise.resolve({ data: [] }),
    admin.from('content_categories').select('slug, label'),
  ])

  const catLabel = new Map((labels ?? []).map((l: { slug: string; label: string }) => [l.slug, l.label]))
  const nichesByWs = new Map<string, string[]>()
  for (const r of (cats ?? []) as { workspace_id: string; category_slug: string }[]) {
    if (!nichesByWs.has(r.workspace_id)) nichesByWs.set(r.workspace_id, [])
    nichesByWs.get(r.workspace_id)!.push(r.category_slug)
  }
  const clicksByWs = new Map<string, number>()
  for (const r of (parts ?? []) as { clipper_workspace_id: string; click_count: number }[]) {
    clicksByWs.set(r.clipper_workspace_id, (clicksByWs.get(r.clipper_workspace_id) ?? 0) + (r.click_count || 0))
  }

  const ranked = candidates
    .map((p) => {
      const niches = nichesByWs.get(p.workspace_id) ?? []
      const overlap = niches.filter((n) => campaignCats.has(n)).length
      const clicks = clicksByWs.get(p.workspace_id) ?? 0
      const followers = p.total_followers ?? 0
      const score = overlap * 1000 + Math.min(clicks, 500) + followers / 1000
      return {
        workspace_id: p.workspace_id,
        display_name: p.display_name,
        bio: p.bio,
        total_followers: followers,
        clicks,
        overlap,
        niches: niches.map((n) => catLabel.get(n) ?? n),
        score,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)

  return NextResponse.json({ clippers: ranked })
}
