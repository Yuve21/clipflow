import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ProfileForm } from './profile-form'

export default async function ClipperProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user!.id).single()
  const wsId = member?.workspace_id

  const [{ data: categories }, { data: profile }, { data: myCats }] = await Promise.all([
    supabase.from('content_categories').select('slug, label').order('sort'),
    supabase.from('clipper_profiles').select('*').eq('workspace_id', wsId).maybeSingle(),
    supabase.from('clipper_categories').select('category_slug').eq('workspace_id', wsId),
  ])

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link
        href="/dashboard/marketplace"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft size={15} /> Back to marketplace
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Clipper profile</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">
        List yourself so brands can find you. Pick the niches you make content in — that&apos;s how campaigns get matched to you.
      </p>
      <ProfileForm
        categories={categories ?? []}
        initial={{
          display_name: profile?.display_name ?? '',
          bio: profile?.bio ?? '',
          min_rate: profile?.min_rate_cents != null ? String(profile.min_rate_cents / 100) : '',
          is_listed: profile?.is_listed ?? false,
          categories: (myCats ?? []).map((c) => c.category_slug),
        }}
      />
    </div>
  )
}
