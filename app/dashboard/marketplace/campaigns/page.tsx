import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Plus, Megaphone, Building2, MousePointerClick, Target } from 'lucide-react'
import { payoutLabel } from '@/lib/marketplace'
import { ParticipantDecision } from './participant-decision'
import { PayButton } from './pay-button'
import { CampaignActions } from './campaign-actions'
import type { CampaignStatus, ParticipationStatus, PayoutModel, PayoutStatus } from '@/types/database'

type Participation = {
  id: string
  status: ParticipationStatus
  pitch: string | null
  applied_at: string
  click_count: number
  clipper_workspace_id: string
}
type CampaignRow = {
  id: string
  title: string
  status: CampaignStatus
  payout_model: PayoutModel
  payout_cents: number
  boosted_until: string | null
  campaign_participations: Participation[]
}

const statusBadge: Record<CampaignStatus, 'green' | 'gray' | 'yellow' | 'red'> = {
  active: 'green', draft: 'gray', paused: 'yellow', closed: 'red',
}

export default async function MyCampaignsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user!.id).single()
  const wsId = member?.workspace_id

  const admin = createAdminClient()
  const { data: brands } = await admin.from('brands').select('id').eq('workspace_id', wsId)
  const brandIds = (brands ?? []).map((b) => b.id)

  let campaigns: CampaignRow[] = []
  if (brandIds.length) {
    const { data } = await admin
      .from('campaigns')
      .select('id, title, status, payout_model, payout_cents, boosted_until, campaign_participations(id, status, pitch, applied_at, click_count, clipper_workspace_id)')
      .in('brand_id', brandIds)
      .order('created_at', { ascending: false })
    campaigns = (data ?? []) as unknown as CampaignRow[]
  }

  const clipperIds = [...new Set(campaigns.flatMap((c) => c.campaign_participations.map((p) => p.clipper_workspace_id)))]
  const { data: profiles } = clipperIds.length
    ? await admin.from('clipper_profiles').select('workspace_id, display_name').in('workspace_id', clipperIds)
    : { data: [] as { workspace_id: string; display_name: string }[] }
  const clipperName = new Map((profiles ?? []).map((p) => [p.workspace_id, p.display_name]))

  // Latest payout status per participation (for the Pay button)
  const partIds = campaigns.flatMap((c) => c.campaign_participations.map((p) => p.id))
  const { data: payouts } = partIds.length
    ? await admin.from('marketplace_payouts').select('participation_id, status, created_at').in('participation_id', partIds).order('created_at', { ascending: false })
    : { data: [] as { participation_id: string; status: PayoutStatus; created_at: string }[] }
  const payoutStatus = new Map<string, PayoutStatus>()
  for (const po of payouts ?? []) {
    if (po.participation_id && !payoutStatus.has(po.participation_id)) {
      payoutStatus.set(po.participation_id, po.status as PayoutStatus)
    }
  }

  // Conversions per participation
  const { data: convs } = partIds.length
    ? await admin.from('tracking_conversions').select('participation_id').in('participation_id', partIds)
    : { data: [] as { participation_id: string }[] }
  const conversionCount = new Map<string, number>()
  for (const cv of convs ?? []) conversionCount.set(cv.participation_id, (conversionCount.get(cv.participation_id) ?? 0) + 1)

  // Which clippers are payout-ready (Stripe-onboarded)
  const { data: clipperWs } = clipperIds.length
    ? await admin.from('workspaces').select('id, stripe_onboarded').in('id', clipperIds)
    : { data: [] as { id: string; stripe_onboarded: boolean }[] }
  const payoutReady = new Map((clipperWs ?? []).map((w) => [w.id, !!w.stripe_onboarded]))

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        href="/dashboard/marketplace"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft size={15} /> Back to marketplace
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">Review who applied and approve the clippers you want.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/dashboard/marketplace/brand"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Building2 size={15} /> Brand profile
          </Link>
          <Link
            href="/dashboard/marketplace/campaigns/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <Plus size={15} /> New campaign
          </Link>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <Card className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
            <Megaphone size={24} className="text-indigo-600" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-gray-900">No campaigns yet</h2>
          <p className="mt-1 text-sm text-gray-500">Create a campaign to start recruiting clippers.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => {
            const applicants = c.campaign_participations
            return (
              <Card key={c.id}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{c.title}</h3>
                    <Badge variant={statusBadge[c.status]}><span className="capitalize">{c.status}</span></Badge>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{payoutLabel(c.payout_model, c.payout_cents)}</span>
                </div>

                {c.status === 'active' && (
                  <div className="mt-3">
                    <CampaignActions campaignId={c.id} boostedUntil={c.boosted_until} />
                  </div>
                )}

                <div className="mt-4 border-t border-gray-100 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {applicants.length} applicant{applicants.length === 1 ? '' : 's'}
                  </p>
                  {applicants.length === 0 ? (
                    <p className="text-sm text-gray-400">No applicants yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {applicants.map((p) => (
                        <div key={p.id} className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{clipperName.get(p.clipper_workspace_id) ?? 'Clipper'}</p>
                            {p.pitch && <p className="mt-0.5 text-xs text-gray-600">{p.pitch}</p>}
                            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                              <span>Applied {new Date(p.applied_at).toLocaleDateString()}</span>
                              <span className="inline-flex items-center gap-1"><MousePointerClick size={11} /> {p.click_count} clicks</span>
                              <span className="inline-flex items-center gap-1"><Target size={11} /> {conversionCount.get(p.id) ?? 0} conv.</span>
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <ParticipantDecision participationId={p.id} initialStatus={p.status} />
                            {['approved', 'active', 'completed'].includes(p.status) && (
                              payoutReady.get(p.clipper_workspace_id)
                                ? <PayButton participationId={p.id} defaultCents={c.payout_cents} payoutStatus={payoutStatus.get(p.id)} />
                                : <span className="text-[11px] text-amber-600">Clipper not payout-ready</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
