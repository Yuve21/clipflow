import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Globe, ExternalLink } from 'lucide-react'
import { ApplyButton } from '../../apply-button'
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
  status: string
  campaign_categories: { category_slug: string }[]
}

export default async function BrandProfileViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user!.id).single()
  const wsId = member?.workspace_id

  const { data: brand } = await supabase
    .from('brands')
    .select('id, workspace_id, name, tagline, website, description, logo_url, brand_categories(category_slug), campaigns(id, title, description, promo_type, payout_model, payout_cents, asset_url, status, campaign_categories(category_slug))')
    .eq('id', id)
    .maybeSingle()

  if (!brand) notFound()

  const isOwn = brand.workspace_id === wsId
  const campaigns = ((brand.campaigns ?? []) as unknown as CampaignRow[]).filter((c) => c.status === 'active')

  const { data: categories } = await supabase.from('content_categories').select('slug, label')
  const catLabel = new Map((categories ?? []).map((c) => [c.slug, c.label]))

  const { data: participations } = await supabase
    .from('campaign_participations').select('campaign_id, status').eq('clipper_workspace_id', wsId)
  const appliedTo = new Map((participations ?? []).map((p) => [p.campaign_id, p.status]))

  const brandCats = (brand.brand_categories ?? []) as { category_slug: string }[]

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        href="/dashboard/marketplace/brands"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft size={15} /> All brands
      </Link>

      <Card className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{brand.name}</h1>
        {brand.tagline && <p className="mt-1 text-gray-500">{brand.tagline}</p>}
        {brand.description && <p className="mt-4 text-sm leading-relaxed text-gray-700">{brand.description}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {brandCats.map((bc) => (
            <Badge key={bc.category_slug} variant="gray">{catLabel.get(bc.category_slug) ?? bc.category_slug}</Badge>
          ))}
        </div>
        {brand.website && (
          <a href={brand.website} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700">
            <Globe size={14} /> {brand.website.replace(/^https?:\/\//, '')}
          </a>
        )}
      </Card>

      <h2 className="mb-3 font-semibold text-gray-900">Open campaigns</h2>
      {campaigns.length === 0 ? (
        <Card className="py-10 text-center text-sm text-gray-500">No open campaigns right now.</Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{c.title}</h3>
                    <Badge variant={promoBadge[c.promo_type]}><span className="capitalize">{c.promo_type}</span></Badge>
                  </div>
                  {c.description && <p className="mt-1 text-sm text-gray-600 line-clamp-2">{c.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">{payoutLabel(c.payout_model, c.payout_cents)}</span>
                    {c.asset_url && (
                      <a href={c.asset_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700">
                        Asset <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
                <ApplyButton campaignId={c.id} isOwn={isOwn} applied={appliedTo.get(c.id)} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
