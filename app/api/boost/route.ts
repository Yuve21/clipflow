import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { BOOST_COST_CREDITS, BOOST_DAYS } from '@/lib/credits'

// POST /api/boost — spend credits to feature a campaign (brand) or clipper
// profile (clipper) at the top of discovery for BOOST_DAYS.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  const wsId = member.workspace_id
  const body = await req.json().catch(() => ({}))
  const type = body?.type
  const admin = createAdminClient()

  // Verify ownership of the thing being boosted BEFORE charging.
  if (type === 'campaign') {
    const { data: campaign } = await admin
      .from('campaigns').select('id, brands(workspace_id)').eq('id', body?.id).single()
    const ownerWs = (campaign as unknown as { brands: { workspace_id: string } } | null)?.brands?.workspace_id
    if (!campaign || ownerWs !== wsId) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
  } else if (type === 'profile') {
    const { data: profile } = await admin
      .from('clipper_profiles').select('workspace_id').eq('workspace_id', wsId).maybeSingle()
    if (!profile) {
      return NextResponse.json({ error: 'Set up your clipper profile first' }, { status: 400 })
    }
  } else {
    return NextResponse.json({ error: 'Invalid boost type' }, { status: 400 })
  }

  // Charge credits atomically.
  const { data: charged, error: chargeErr } = await admin
    .rpc('consume_ai_credits', { p_workspace_id: wsId, p_n: BOOST_COST_CREDITS })
  if (chargeErr) return NextResponse.json({ error: 'Could not charge credits' }, { status: 500 })
  if (!charged) {
    return NextResponse.json(
      { error: `Boosting costs ${BOOST_COST_CREDITS} credits — buy more to feature this.`, code: 'no_credits' },
      { status: 402 }
    )
  }

  const boostedUntil = new Date(Date.now() + BOOST_DAYS * 24 * 60 * 60 * 1000).toISOString()

  if (type === 'campaign') {
    await admin.from('campaigns').update({ boosted_until: boostedUntil }).eq('id', body.id)
  } else {
    await admin.from('clipper_profiles').update({ boosted_until: boostedUntil }).eq('workspace_id', wsId)
  }

  return NextResponse.json({ ok: true, boosted_until: boostedUntil })
}
