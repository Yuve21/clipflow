import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const wsId = member.workspace_id

    const admin = createAdminClient()
    const { data: workspace } = await admin
      .from('workspaces')
      .select('id, stripe_account_id, stripe_onboarded')
      .eq('id', wsId)
      .single()

    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const ws = workspace as { id: string; stripe_account_id: string | null; stripe_onboarded: boolean }

    if (ws.stripe_account_id && ws.stripe_onboarded) {
      return NextResponse.json({ alreadyConnected: true })
    }

    const stripe = getStripe()
    let accountId = ws.stripe_account_id

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })
      accountId = account.id

      const { error: saveError } = await admin
        .from('workspaces')
        .update({ stripe_account_id: accountId })
        .eq('id', wsId)

      if (saveError) {
        return NextResponse.json({ error: saveError.message }, { status: 500 })
      }
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings?stripe=refresh`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings?stripe=success`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: link.url })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
