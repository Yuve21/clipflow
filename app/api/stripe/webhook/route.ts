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
