import { createClient as createSupabase } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

const TERM_VERSION = 'v1'

function buildTermText(clientName: string, accounts: { platform: string; handle: string; follower_count: number }[]) {
  const accountList = accounts
    .map(a => `@${a.handle} on ${a.platform} (${formatFollowers(a.follower_count)} followers)`)
    .join(', ')

  return `I, the undersigned, authorize clips drawn from my content stream to be created and posted to market me by the following account(s): ${accountList || '[accounts to be added]'}. Clips may be posted at the clipper's discretion without requiring per-clip approval from me. This agreement covers all content posted from the date of acceptance until either party terminates this arrangement in writing.`
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      workspace_id, name, source_platform, rate_type, rate_amount,
      retainer_period, deliverables_per_period, brand_notes, posting_accounts,
    } = body

    // Verify membership
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = createAdminClient()

    // 1. Create client
    const { data: client, error: clientError } = await admin
      .from('clients')
      .insert({
        workspace_id, name, source_platform: source_platform || null,
        rate_type, rate_amount: rate_amount || null,
        retainer_period: retainer_period || null,
        deliverables_per_period: deliverables_per_period || null,
        brand_notes: brand_notes || null,
        status: 'pending_agreement',
      })
      .select()
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: clientError?.message || 'Failed to create client' }, { status: 500 })
    }

    // 2. Insert posting accounts
    if (posting_accounts?.length) {
      await admin.from('posting_accounts').insert(
        posting_accounts.map((pa: { platform: string; handle: string; follower_count: number }) => ({
          client_id: client.id,
          platform: pa.platform,
          handle: pa.handle,
          follower_count: pa.follower_count || 0,
        }))
      )
    }

    // 3. Generate agreement
    const token = randomBytes(24).toString('hex')
    const termText = buildTermText(name, posting_accounts || [])

    await admin.from('client_agreements').insert({
      client_id: client.id,
      term_version: TERM_VERSION,
      term_text: termText,
      token,
    })

    return NextResponse.json({ client, token })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
