import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getPack } from '@/lib/credits'

// Creates a Stripe Checkout session to buy a credit pack. This is a direct
// PLATFORM charge (no Connect transfer/application_fee) — the full amount is
// ClipFlow revenue. Credits are granted in the webhook on payment success.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pack_id } = await req.json().catch(() => ({}))
  const pack = getPack(pack_id)
  if (!pack) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  const admin = createAdminClient()

  const { data: purchase, error: purchaseError } = await admin
    .from('credit_purchases')
    .insert({
      workspace_id: member.workspace_id,
      pack_id: pack.id,
      credits: pack.credits,
      amount_cents: pack.priceCents,
      status: 'pending',
    })
    .select()
    .single()

  if (purchaseError || !purchase) {
    return NextResponse.json({ error: purchaseError?.message || 'Failed to create purchase' }, { status: 500 })
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
            unit_amount: pack.priceCents,
            product_data: {
              name: `ClipFlow — ${pack.credits} AI Clipper credits`,
              description: `${pack.label} pack · 1 credit = 1 AI clip job`,
            },
          },
        },
      ],
      metadata: {
        type: 'credit_purchase',
        purchase_id: purchase.id,
        workspace_id: member.workspace_id,
        credits: String(pack.credits),
      },
      success_url: `${siteUrl}/dashboard/ai-clipper?credits=added`,
      cancel_url: `${siteUrl}/dashboard/ai-clipper?credits=canceled`,
    })

    await admin
      .from('credit_purchases')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', purchase.id)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    await admin.from('credit_purchases').update({ status: 'canceled' }).eq('id', purchase.id)
    console.error('Credit checkout failed', err)
    return NextResponse.json({ error: 'Failed to start checkout' }, { status: 500 })
  }
}
