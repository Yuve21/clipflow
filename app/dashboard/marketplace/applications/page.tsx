import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, MousePointerClick, Megaphone, Target } from 'lucide-react'
import { TrackingLink } from './tracking-link'
import { BoostProfileButton } from './boost-profile-button'
import type { ParticipationStatus } from '@/types/database'

type Row = {
  id: string
  status: ParticipationStatus
  track_token: string | null
  click_count: number
  campaigns: { title: string; brands: { name: string } | null } | null
}

const statusBadge: Record<ParticipationStatus, 'gray' | 'green' | 'red' | 'yellow' | 'indigo'> = {
  applied: 'yellow', approved: 'green', active: 'green', completed: 'indigo', rejected: 'red',
}

export default async function MyApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user!.id).single()
  const wsId = member?.workspace_id

  const admin = createAdminClient()
  const { data } = await admin
    .from('campaign_participations')
    .select('id, status, track_token, click_count, campaigns(title, brands(name))')
    .eq('clipper_workspace_id', wsId)
    .order('applied_at', { ascending: false })
  const rows = (data ?? []) as unknown as Row[]

  const partIds = rows.map((r) => r.id)
  const { data: convs } = partIds.length
    ? await admin.from('tracking_conversions').select('participation_id').in('participation_id', partIds)
    : { data: [] as { participation_id: string }[] }
  const convCount = new Map<string, number>()
  for (const cv of convs ?? []) convCount.set(cv.participation_id, (convCount.get(cv.participation_id) ?? 0) + 1)

  const site = process.env.NEXT_PUBLIC_SITE_URL || ''

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        href="/dashboard/marketplace"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft size={15} /> Back to marketplace
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My applications</h1>
          <p className="mt-1 mb-6 text-sm text-gray-500">
            Track the campaigns you applied to. Share your tracked link in your clips — every click counts toward your performance.
          </p>
        </div>
        <BoostProfileButton />
      </div>

      {rows.length === 0 ? (
        <Card className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
            <Megaphone size={24} className="text-indigo-600" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-gray-900">No applications yet</h2>
          <p className="mt-1 text-sm text-gray-500">Browse the marketplace and apply to campaigns to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-400">{r.campaigns?.brands?.name ?? 'Brand'}</p>
                  <h3 className="font-semibold text-gray-900">{r.campaigns?.title ?? 'Campaign'}</h3>
                </div>
                <Badge variant={statusBadge[r.status]}><span className="capitalize">{r.status}</span></Badge>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                  <MousePointerClick size={14} className="text-indigo-500" />
                  <span className="font-semibold text-gray-900">{r.click_count}</span> clicks
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                  <Target size={14} className="text-emerald-500" />
                  <span className="font-semibold text-gray-900">{convCount.get(r.id) ?? 0}</span> conversions
                </span>
              </div>

              {r.track_token && site && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium text-gray-500">Your tracked link</p>
                  <TrackingLink url={`${site}/r/${r.track_token}`} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
