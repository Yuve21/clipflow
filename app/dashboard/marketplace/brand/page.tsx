import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BrandForm } from './brand-form'

export default async function BrandProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user!.id).single()
  const wsId = member?.workspace_id

  const { data: categories } = await supabase
    .from('content_categories').select('slug, label').order('sort')

  const { data: brand } = await supabase
    .from('brands').select('id, name, tagline, website, description, logo_url, is_listed')
    .eq('workspace_id', wsId).order('created_at', { ascending: true }).limit(1).maybeSingle()

  const { data: brandCats } = brand
    ? await supabase.from('brand_categories').select('category_slug').eq('brand_id', brand.id)
    : { data: [] as { category_slug: string }[] }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link
        href="/dashboard/marketplace"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft size={15} /> Back to marketplace
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Brand profile</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">
        How clippers see you in the marketplace. List your brand and tag your niches so the right
        clippers find you.
      </p>
      <BrandForm
        categories={categories ?? []}
        initial={{
          name: brand?.name ?? '',
          tagline: brand?.tagline ?? '',
          website: brand?.website ?? '',
          description: brand?.description ?? '',
          logo_url: brand?.logo_url ?? '',
          is_listed: brand?.is_listed ?? true,
          categories: (brandCats ?? []).map((c) => c.category_slug),
        }}
      />
    </div>
  )
}
