import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CampaignForm } from './campaign-form'

export default async function NewCampaignPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('content_categories').select('slug, label').order('sort')

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link
        href="/dashboard/marketplace"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft size={15} /> Back to marketplace
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Create a campaign</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">
        Describe what you want promoted and how clippers get paid. Publish to make it discoverable.
      </p>
      <CampaignForm categories={categories ?? []} />
    </div>
  )
}
