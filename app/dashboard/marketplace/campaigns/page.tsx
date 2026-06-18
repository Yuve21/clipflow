import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Plus, Megaphone, Building2 } from 'lucide-react'
import { payoutLabel } from '@/lib/marketplace'
import { ParticipantDecision } from './participant-decision'
import type { CampaignStatus, ParticipationStatus, PayoutModel } from '@/types/database'

type Participation = {
  id: string
  status: ParticipationStatus
  pitch: string | null
  applied_at: string
  clipper_workspace_id: string
}
type CampaignRow = {
  id: string
  title: string
  status: CampaignStatus
  payout_model: PayoutModel
  payout_cents: number
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
      .select('id, title, status, payout_model, payout_cents, campaign_participations(id, status, pitch, applied_at, clipper_workspace_id)')
      .in('brand_id', brandIds)
      .order('created_at', { ascending: false })
    campaigns = (data ?? []) as unknown as CampaignRow[]
  }

  const clipperIds = [...new Set(campaigns.flatMap((c) => c.campaign_participations.map((p) => p.clipper_workspace_id)))]
  const { data: profiles } = clipperIds.length
    ? await admin.from('clipper_profiles').select('workspace_id, display_name').in('workspace_id', clipperIds)
    : { data: [] as { workspace_id: string; display_name: string }[] }
  const clipperName = new Map((profiles ?? []).map((p) => [p.workspace_id, p.display_name]))

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
                            <p className="mt-0.5 text-[11px] text-gray-400">Applied {new Date(p.applied_at).toLocaleDateString()}</p>
                          </div>
                          <ParticipantDecision participationId={p.id} initialStatus={p.status} />
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
