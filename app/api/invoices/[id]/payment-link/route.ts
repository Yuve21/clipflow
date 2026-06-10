import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getStripe, platformFeeCents } from '@/lib/stripe'

interface InvoiceWithClient {
  id: string
  status: string
  total: number
  stripe_payment_link: string | null
  clients: { id: string; name: string; portal_token: string; workspace_id: string } | null
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Invoice → client → workspace (invoices have no workspace_id column)
    const { data: invoiceData } = await admin
      .from('invoices')
      .select('id, status, total, stripe_payment_link, clients(id, name, portal_token, workspace_id)')
      .eq('id', id)
      .single()

    const invoice = invoiceData as unknown as InvoiceWithClient | null
    if (!invoice || !invoice.clients) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const client = invoice.clients
    const wsId = client.workspace_id

    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', wsId)
      .eq('user_id', user.id)
      .single()

    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (invoice.status !== 'sent') {
      return NextResponse.json({ error: 'Only sent invoices can be paid online' }, { status: 400 })
    }

    const { data: workspaceData } = await admin
      .from('workspaces')
      .select('stripe_account_id, stripe_onboarded')
      .eq('id', wsId)
      .single()

    const workspace = workspaceData as { stripe_account_id: string | null; stripe_onboarded: boolean } | null
    if (!workspace?.stripe_account_id || !workspace.stripe_onboarded) {
      return NextResponse.json({ error: 'Connect Stripe first' }, { status: 400 })
    }

    // invoices.total is numeric dollars — convert to cents for Stripe
    const totalCents = Math.round(Number(invoice.total) * 100)
    if (!totalCents || totalCents < 50) {
      return NextResponse.json({ error: 'Invoice total is too small to pay online' }, { status: 400 })
    }

    const feeCents = platformFeeCents(totalCents)

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: totalCents,
            product_data: {
              name: `Invoice — ${client.name}`,
              description: `ClipFlow invoice #${invoice.id.slice(0, 8)}`,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: feeCents,
        transfer_data: { destination: workspace.stripe_account_id },
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/portal/${client.portal_token}?paid=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/portal/${client.portal_token}`,
      metadata: { invoice_id: invoice.id, workspace_id: wsId },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
    }

    const { error: saveError } = await admin
      .from('invoices')
      .update({
        stripe_checkout_session_id: session.id,
        stripe_payment_link: session.url,
        platform_fee_cents: feeCents,
      })
      .eq('id', invoice.id)

    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
