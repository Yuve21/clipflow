import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const BRAND_DECISIONS = ['approved', 'rejected', 'active', 'completed']

// PATCH /api/participations/[id] — the campaign's brand owner decides on an applicant.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const status = body?.status
  if (!BRAND_DECISIONS.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Load participation → campaign → brand to verify the caller owns the campaign
  const { data: part } = await admin
    .from('campaign_participations')
    .select('id, campaign_id, campaigns(brand_id, brands(workspace_id))')
    .eq('id', id)
    .single()

  const ownerWs = (part as unknown as { campaigns: { brands: { workspace_id: string } } } | null)
    ?.campaigns?.brands?.workspace_id

  if (!part || ownerWs !== member.workspace_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await admin
    .from('campaign_participations')
    .update({ status, decided_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
