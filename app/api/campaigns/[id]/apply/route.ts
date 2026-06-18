import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// POST /api/campaigns/[id]/apply — a clipper applies to promote a campaign
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const pitch = typeof body?.pitch === 'string' ? body.pitch.trim().slice(0, 1000) : null

  const admin = createAdminClient()

  // Campaign must exist and be active
  const { data: campaign } = await admin
    .from('campaigns').select('id, status, brand_id').eq('id', campaignId).single()
  if (!campaign || campaign.status !== 'active') {
    return NextResponse.json({ error: 'Campaign is not open for applications' }, { status: 404 })
  }

  // Don't let a brand apply to its own campaign
  const { data: brand } = await admin.from('brands').select('workspace_id').eq('id', campaign.brand_id).single()
  if (brand?.workspace_id === member.workspace_id) {
    return NextResponse.json({ error: "You can't apply to your own campaign" }, { status: 400 })
  }

  const { error } = await admin.from('campaign_participations').insert({
    campaign_id: campaignId,
    clipper_workspace_id: member.workspace_id,
    pitch,
    status: 'applied',
  })

  if (error) {
    // Unique violation → already applied
    if (error.code === '23505') {
      return NextResponse.json({ error: 'You already applied to this campaign' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
