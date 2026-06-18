import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Building2, Globe } from 'lucide-react'

type BrandRow = {
  id: string
  name: string
  tagline: string | null
  website: string | null
  description: string | null
  brand_categories: { category_slug: string }[]
  campaigns: { id: string; status: string }[]
}

export default async function BrandsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>
}) {
  const { cat } = await searchParams
  const supabase = await createClient()

  const [{ data: categories }, { data: brandsData }] = await Promise.all([
    supabase.from('content_categories').select('slug, label').order('sort'),
    supabase
      .from('brands')
      .select('id, name, tagline, website, description, brand_categories(category_slug), campaigns(id, status)')
      .eq('is_listed', true)
      .order('created_at', { ascending: false }),
  ])

  const all = (brandsData ?? []) as unknown as BrandRow[]
  const brands = cat ? all.filter((b) => b.brand_categories.some((bc) => bc.category_slug === cat)) : all
  const catLabel = new Map((categories ?? []).map((c) => [c.slug, c.label]))

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link
        href="/dashboard/marketplace"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft size={15} /> Back to marketplace
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Browse brands</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">Find brands to clip for and apply to their open campaigns.</p>

      <div className="mb-6 flex flex-wrap gap-2">
        <FilterChip label="All" href="/dashboard/marketplace/brands" active={!cat} />
        {(categories ?? []).map((c) => (
          <FilterChip key={c.slug} label={c.label} href={`/dashboard/marketplace/brands?cat=${c.slug}`} active={cat === c.slug} />
        ))}
      </div>

      {brands.length === 0 ? (
        <Card className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
            <Building2 size={24} className="text-indigo-600" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-gray-900">No brands here yet</h2>
          <p className="mt-1 text-sm text-gray-500">{cat ? 'No listed brands in this category.' : 'Brands will show up here once they list themselves.'}</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {brands.map((b) => {
            const activeCount = b.campaigns.filter((c) => c.status === 'active').length
            return (
              <Link key={b.id} href={`/dashboard/marketplace/brands/${b.id}`}>
                <Card className="h-full transition-colors hover:border-indigo-200">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{b.name}</h3>
                    {activeCount > 0 && <Badge variant="green">{activeCount} open</Badge>}
                  </div>
                  {b.tagline && <p className="mt-0.5 text-sm text-gray-500">{b.tagline}</p>}
                  {b.description && <p className="mt-2 text-sm text-gray-600 line-clamp-2">{b.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {b.brand_categories.map((bc) => (
                      <Badge key={bc.category_slug} variant="gray">{catLabel.get(bc.category_slug) ?? bc.category_slug}</Badge>
                    ))}
                  </div>
                  {b.website && (
                    <p className="mt-3 inline-flex items-center gap-1 text-xs text-gray-400">
                      <Globe size={12} /> {b.website.replace(/^https?:\/\//, '')}
                    </p>
                  )}
                </Card>
              </Link>
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
