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
