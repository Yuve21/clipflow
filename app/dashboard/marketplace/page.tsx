import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Megaphone, Plus, UserCog, ExternalLink, Building2, Inbox, ListChecks, Coins, Star } from 'lucide-react'
import { ApplyButton } from './apply-button'
import { BuyCreditsButton } from '../ai-clipper/buy-credits-button'
import { payoutLabel, promoBadge } from '@/lib/marketplace'
import type { PayoutModel, PromoType } from '@/types/database'

type CampaignRow = {
  id: string
  title: string
  description: string | null
  promo_type: PromoType
  payout_model: PayoutModel
  payout_cents: number
  asset_url: string | null
  boosted_until: string | null
  brands: { name: string; website: string | null; workspace_id: string } | null
  campaign_categories: { category_slug: string }[]
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>
}) {
  const { cat } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user!.id).single()
  const wsId = member?.workspace_id

  const [{ data: categories }, { data: campaignsData }, { data: participations }, { data: workspace }] = await Promise.all([
    supabase.from('content_categories').select('slug, label').order('sort'),
    supabase
      .from('campaigns')
      .select('id, title, description, promo_type, payout_model, payout_cents, asset_url, boosted_until, brands(name, website, workspace_id), campaign_categories(category_slug)')
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase.from('campaign_participations').select('campaign_id, status').eq('clipper_workspace_id', wsId),
    supabase.from('workspaces').select('ai_credits').eq('id', wsId).single(),
  ])

  const nowMs = Date.now()
  const isBoosted = (c: CampaignRow) => !!c.boosted_until && new Date(c.boosted_until).getTime() > nowMs

  const allCampaigns = ((campaignsData ?? []) as unknown as CampaignRow[])
    // Featured (boosted) campaigns first, then newest (stable sort preserves the query order).
    .sort((a, b) => (isBoosted(b) ? 1 : 0) - (isBoosted(a) ? 1 : 0))
  const campaigns = cat
    ? allCampaigns.filter((c) => c.campaign_categories.some((cc) => cc.category_slug === cat))
    : allCampaigns

  const appliedTo = new Map((participations ?? []).map((p) => [p.campaign_id, p.status]))
  const catLabel = new Map((categories ?? []).map((c) => [c.slug, c.label]))
  const credits = workspace?.ai_credits ?? 0

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
            <Badge variant="indigo">New</Badge>
          </div>
          <p className="text-sm text-gray-500 max-w-xl">
            Get paid to promote brands, services, and music — or post a campaign and let clippers amplify yours.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700"
            title="Credits power AI clips, clipper-matching, and boosts"
          >
            <Coins size={15} /> {credits}
          </div>
          <BuyCreditsButton />
          <Link
            href="/dashboard/marketplace/brands"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Building2 size={15} /> Browse brands
          </Link>
          <Link
            href="/dashboard/marketplace/applications"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <ListChecks size={15} /> My applications
          </Link>
          <Link
            href="/dashboard/marketplace/campaigns"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Inbox size={15} /> My campaigns
          </Link>
          <Link
            href="/dashboard/marketplace/profile"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <UserCog size={15} /> Clipper profile
          </Link>
          <Link
            href="/dashboard/marketplace/campaigns/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <Plus size={15} /> Create campaign
          </Link>
        </div>
      </div>

      {/* Category filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <FilterChip label="All" href="/dashboard/marketplace" active={!cat} />
        {(categories ?? []).map((c) => (
          <FilterChip
            key={c.slug}
            label={c.label}
            href={`/dashboard/marketplace?cat=${c.slug}`}
            active={cat === c.slug}
          />
        ))}
      </div>

      {campaigns.length === 0 ? (
        <Card className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
            <Megaphone size={24} className="text-indigo-600" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-gray-900">No campaigns yet</h2>
          <p className="mt-1 text-sm text-gray-500">
            {cat ? 'No active campaigns in this category. Try another filter.' : 'Be the first — create a campaign to reach clippers.'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((c) => {
            const isOwn = c.brands?.workspace_id === wsId
            const applied = appliedTo.get(c.id)
            return (
              <Card key={c.id} className={`flex flex-col ${isBoosted(c) ? 'ring-1 ring-indigo-200' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-gray-400">{c.brands?.name ?? 'Brand'}</p>
                      {isBoosted(c) && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600">
                          <Star size={9} className="fill-indigo-600" /> Featured
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 leading-snug">{c.title}</h3>
                  </div>
                  <Badge variant={promoBadge[c.promo_type]}>
                    <span className="capitalize">{c.promo_type}</span>
                  </Badge>
                </div>

                {c.description && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-3">{c.description}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.campaign_categories.map((cc) => (
                    <Badge key={cc.category_slug} variant="gray">{catLabel.get(cc.category_slug) ?? cc.category_slug}</Badge>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{payoutLabel(c.payout_model, c.payout_cents)}</p>
                    {c.asset_url && (
                      <a
                        href={c.asset_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                      >
                        View asset <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  <ApplyButton campaignId={c.id} isOwn={isOwn} applied={applied} />
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white'
          : 'rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50'
      }
    >
      {label}
    </Link>
  )
}
