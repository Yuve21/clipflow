import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getStripe, marketplaceTakeCents } from '@/lib/stripe'

// POST /api/payouts/checkout — a brand pays an approved clipper.
// Brand pays the gross via Checkout (platform charge); ClipFlow keeps 15% and
// transfers the net to the clipper's connected account (in the webhook).
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  const brandWs = member.workspace_id
  const body = await req.json().catch(() => ({}))
  const participationId = body?.participation_id

  const admin = createAdminClient()

  const { data: part } = await admin
    .from('campaign_participations')
    .select('id, status, clipper_workspace_id, campaign_id, campaigns(title, payout_cents, brands(workspace_id))')
    .eq('id', participationId)
    .single()

  const p = part as unknown as {
    id: string; status: string; clipper_workspace_id: string; campaign_id: string
    campaigns: { title: string; payout_cents: number; brands: { workspace_id: string } }
  } | null

  if (!p || p.campaigns?.brands?.workspace_id !== brandWs) {
    return NextResponse.json({ error: 'Participation not found' }, { status: 404 })
  }
  if (!['approved', 'active', 'completed'].includes(p.status)) {
    return NextResponse.json({ error: 'You can only pay an approved clipper' }, { status: 400 })
  }

  const gross = body?.amount_cents != null
    ? Math.round(Number(body.amount_cents))
    : (p.campaigns.payout_cents || 0)
  if (!gross || gross < 50) {
    return NextResponse.json({ error: 'Amount must be at least $0.50' }, { status: 400 })
  }

  // The clipper must be Stripe-onboarded to receive a transfer.
  const { data: clipperWs } = await admin
    .from('workspaces').select('stripe_account_id, stripe_onboarded').eq('id', p.clipper_workspace_id).single()
  if (!clipperWs?.stripe_onboarded || !clipperWs.stripe_account_id) {
    return NextResponse.json(
      { error: 'This clipper has not connected Stripe yet, so they can\'t receive payouts.' },
      { status: 400 }
    )
  }

  const take = marketplaceTakeCents(gross)
  const net = gross - take

  const { data: payout, error: payoutErr } = await admin
    .from('marketplace_payouts')
    .insert({
      campaign_id: p.campaign_id,
      participation_id: p.id,
      brand_workspace_id: brandWs,
      clipper_workspace_id: p.clipper_workspace_id,
      gross_cents: gross,
      take_cents: take,
      net_cents: net,
      status: 'pending',
    })
    .select('id').single()

  if (payoutErr || !payout) {
    return NextResponse.json({ error: payoutErr?.message || 'Failed to create payout' }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: gross,
            product_data: { name: `Clipper payout — ${p.campaigns.title}` },
          },
        },
      ],
      payment_intent_data: { metadata: { type: 'marketplace_payout', payout_id: payout.id } },
      metadata: { type: 'marketplace_payout', payout_id: payout.id },
      success_url: `${siteUrl}/dashboard/marketplace/campaigns?paid=1`,
      cancel_url: `${siteUrl}/dashboard/marketplace/campaigns?canceled=1`,
    })

    await admin.from('marketplace_payouts').update({ stripe_checkout_session_id: session.id }).eq('id', payout.id)
    return NextResponse.json({ url: session.url })
  } catch (err) {
    await admin.from('marketplace_payouts').update({ status: 'failed', note: 'checkout creation failed' }).eq('id', payout.id)
    console.error('Payout checkout failed', err)
    return NextResponse.json({ error: 'Failed to start checkout' }, { status: 500 })
  }
}
