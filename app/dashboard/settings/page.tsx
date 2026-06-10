import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Check, Sparkles } from 'lucide-react'
import { Suspense } from 'react'
import { WorkspaceNameForm, CopyWorkspaceId } from './workspace-name-form'
import { StripeConnectButton } from './stripe-connect-button'

const PRO_FEATURES = ['AI Clipper', 'Unlimited jobs', 'Priority support']

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user!.id)
    .single()

  if (!member) {
    return <div className="p-8 text-gray-500">Setting up your workspace…</div>
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, plan, created_at')
    .eq('id', member.workspace_id)
    .single()

  if (!workspace) {
    return <div className="p-8 text-gray-500">Workspace not found.</div>
  }

  const isPro = workspace.plan === 'pro'
  const joinedDate = new Date(workspace.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your workspace, plan, and account.</p>
      </div>

      <div className="space-y-6">
        {/* Workspace */}
        <Card>
          <h2 className="font-semibold text-gray-900">Workspace</h2>
          <div className="mt-4 space-y-5">
            <WorkspaceNameForm workspaceId={workspace.id} initialName={workspace.name} />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Workspace ID</span>
              <CopyWorkspaceId workspaceId={workspace.id} />
            </div>
          </div>
        </Card>

        {/* Plan */}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Plan</h2>
            {isPro ? (
              <Badge variant="indigo">
                <Sparkles size={12} className="mr-1" />
                Pro
              </Badge>
            ) : (
              <Badge variant="gray">Free</Badge>
            )}
          </div>
          {isPro ? (
            <div className="mt-4">
              <p className="text-sm text-gray-600">You&apos;re on the Pro plan. Included in your plan:</p>
              <ul className="mt-3 space-y-2">
                {PRO_FEATURES.map(feature => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check size={14} className="text-indigo-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">
                You&apos;re on the free plan. Upgrade to Pro for AI Clipper, unlimited jobs, and
                priority support.
              </p>
              <Link href="#" className="shrink-0">
                <Button size="sm">
                  <Sparkles size={14} />
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Account */}
        <Card>
          <h2 className="font-semibold text-gray-900">Account</h2>
          <dl className="mt-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="text-sm font-medium text-gray-900">{user!.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-gray-500">Joined</dt>
              <dd className="text-sm font-medium text-gray-900">{joinedDate}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-gray-500">Role</dt>
              <dd>
                <Badge variant="indigo">Owner</Badge>
              </dd>
            </div>
          </dl>
        </Card>

        {/* Payments */}
        <Card>
          <h2 className="font-semibold text-gray-900">Payments &amp; Stripe Connect</h2>
          <p className="mt-2 text-sm text-gray-600">
            Accept invoice payments directly through ClipFlow. ClipFlow takes a 4% platform fee on
            each payment. Powered by Stripe.
          </p>
          <div className="mt-4">
            <Suspense
              fallback={
                <div className="flex items-center justify-between gap-4">
                  <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
                  <div className="h-9 w-36 bg-gray-100 rounded-lg animate-pulse" />
                </div>
              }
            >
              <StripeConnectButton />
            </Suspense>
          </div>
        </Card>

        {/* Danger zone */}
        <Card className="border-red-200">
          <h2 className="font-semibold text-red-600">Danger zone</h2>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              This will permanently delete all clients, clips, and data. This cannot be undone.
            </p>
            <Button
              variant="danger"
              size="sm"
              className="shrink-0"
              disabled
              title="Contact support to delete your workspace"
            >
              Delete workspace
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
