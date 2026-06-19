import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

// GET /api/referrals — the workspace's referral code (lazily generated) + stats
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  const wsId = member.workspace_id
  const admin = createAdminClient()

  const { data: ws } = await admin.from('workspaces').select('referral_code').eq('id', wsId).single()
  let code = ws?.referral_code as string | null

  if (!code) {
    code = randomBytes(4).toString('hex')
    await admin.from('workspaces').update({ referral_code: code }).eq('id', wsId)
  }

  const { data: refs } = await admin
    .from('referrals').select('reward_credits').eq('referrer_workspace_id', wsId)

  const signups = refs?.length ?? 0
  const creditsEarned = (refs ?? []).reduce((s, r) => s + (r.reward_credits || 0), 0)

  return NextResponse.json({ code, signups, creditsEarned })
}
