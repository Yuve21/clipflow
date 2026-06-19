import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // ── Credit pack purchase — grant AI credits (platform revenue) ────────────
    if (session.metadata?.type === 'credit_purchase' && session.payment_status === 'paid') {
      const admin = createAdminClient()
      const purchaseId = session.metadata.purchase_id

      // Idempotent: only the transition pending→paid grants credits, so repeated
      // webhook deliveries never double-credit.
      const { data: claimed } = await admin
        .from('credit_purchases')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', purchaseId)
        .eq('status', 'pending')
        .select('workspace_id, credits')
        .single()

      if (claimed) {
        const { error: grantError } = await admin.rpc('add_ai_credits', {
          p_workspace_id: claimed.workspace_id,
          p_amount: claimed.credits,
        })
        if (grantError) {
          console.error('Stripe webhook: failed to grant credits', purchaseId, grantError)
          return NextResponse.json({ error: 'Failed to grant credits' }, { status: 500 })
        }
      }
      return NextResponse.json({ received: true })
    }

    // ── Marketplace payout — brand paid; transfer net to the clipper ──────────
    if (session.metadata?.type === 'marketplace_payout' && session.payment_status === 'paid') {
      const admin = createAdminClient()
      const payoutId = session.metadata.payout_id

      // Idempotent: only pending→paid proceeds to a transfer.
      const { data: claimed } = await admin
        .from('marketplace_payouts')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', payoutId)
        .eq('status', 'pending')
        .select('clipper_workspace_id, net_cents')
        .single()

      if (claimed) {
        const { data: clipperWs } = await admin
          .from('workspaces').select('stripe_account_id').eq('id', claimed.clipper_workspace_id).single()
        const dest = clipperWs?.stripe_account_id

        if (!dest) {
          await admin.from('marketplace_payouts')
            .update({ status: 'failed', note: 'clipper has no connected account' }).eq('id', payoutId)
        } else {
          try {
            // Draw the transfer from this specific charge (avoids platform balance timing).
            let sourceTransaction: string | undefined
            if (typeof session.payment_intent === 'string') {
              const pi = await getStripe().paymentIntents.retrieve(session.payment_intent, { expand: ['latest_charge'] })
              const charge = pi.latest_charge
              sourceTransaction = typeof charge === 'string' ? charge : charge?.id
            }
            const transfer = await getStripe().transfers.create({
              amount: claimed.net_cents,
              currency: 'usd',
              destination: dest,
              ...(sourceTransaction ? { source_transaction: sourceTransaction } : {}),
              metadata: { payout_id: payoutId },
            })
            await admin.from('marketplace_payouts')
              .update({ status: 'transferred', stripe_transfer_id: transfer.id }).eq('id', payoutId)
          } catch (err) {
            // Payment already captured — mark failed for manual resolution, return 200.
            console.error('Payout transfer failed', payoutId, err)
            await admin.from('marketplace_payouts')
              .update({ status: 'failed', note: 'transfer failed' }).eq('id', payoutId)
          }
        }
      }
      return NextResponse.json({ received: true })
    }

    const invoiceId = session.metadata?.invoice_id

    if (invoiceId && session.payment_status === 'paid') {
      const admin = createAdminClient()
      const { error } = await admin
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_via_stripe: true,
          stripe_payment_intent_id:
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
        })
        .eq('id', invoiceId)

      if (error) {
        console.error('Stripe webhook: failed to mark invoice paid', invoiceId, error)
        // Non-2xx makes Stripe retry the event
        return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ received: true })
}
