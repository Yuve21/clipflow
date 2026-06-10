import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

export async function GET() {
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
      .select('stripe_account_id, stripe_onboarded')
      .eq('id', wsId)
      .single()

    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const ws = workspace as { stripe_account_id: string | null; stripe_onboarded: boolean }
    let onboarded = ws.stripe_onboarded

    // Stripe doesn't push onboarding completion to us — poll on status checks
    if (ws.stripe_account_id && !onboarded) {
      const account = await getStripe().accounts.retrieve(ws.stripe_account_id)
      if (account.details_submitted) {
        onboarded = true
        await admin.from('workspaces').update({ stripe_onboarded: true }).eq('id', wsId)
      }
    }

    return NextResponse.json({ connected: onboarded, accountId: ws.stripe_account_id ?? null })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
