import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Sparkles, ArrowRight } from 'lucide-react'
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

      <Link
        href="/dashboard/ai-clipper"
        className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 transition-colors hover:bg-indigo-50"
      >
        <div className="flex items-start gap-3">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-indigo-500" />
          <div>
            <p className="text-sm font-medium text-indigo-900">Need promo clips to seed your campaign?</p>
            <p className="text-sm text-indigo-700">Upload your own long content — webinars, demos, founder pods — and let the AI Clipper cut viral moments for you.</p>
          </div>
        </div>
        <ArrowRight size={16} className="shrink-0 text-indigo-500" />
      </Link>

      <CampaignForm categories={categories ?? []} />
    </div>
  )
}
