import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// POST /api/referrals/claim — attribute the current (newly signed-up) workspace
// to a referrer's code. The reward is granted later, when the referred workspace
// runs its first AI job (anti-farming — see app/api/ai-clipper/jobs). Idempotent.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  const wsId = member.workspace_id
  const body = await req.json().catch(() => ({}))
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  if (!code) return NextResponse.json({ ok: false })

  const admin = createAdminClient()

  const { data: referrer } = await admin
    .from('workspaces').select('id').eq('referral_code', code).maybeSingle()
  if (!referrer || referrer.id === wsId) return NextResponse.json({ ok: false }) // invalid or self

  // Already referred? (one referral per referred workspace)
  const { data: existing } = await admin
    .from('referrals').select('id').eq('referred_workspace_id', wsId).maybeSingle()
  if (existing) return NextResponse.json({ ok: true, already: true })

  const { error } = await admin.from('referrals').insert({
    referrer_workspace_id: referrer.id,
    code,
    referred_workspace_id: wsId,
    status: 'signed_up',
    reward_credits: 0, // granted on the referred user's first AI job
    converted_at: new Date().toISOString(),
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ ok: true, already: true }) // unique race
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Record referred_by if a profile exists (best-effort).
  await admin.from('clipper_profiles').update({ referred_by: referrer.id }).eq('workspace_id', wsId)

  return NextResponse.json({ ok: true, attributed: true })
}
