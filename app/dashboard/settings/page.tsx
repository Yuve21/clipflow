import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Coins } from 'lucide-react'
import { Suspense } from 'react'
import { WorkspaceNameForm, CopyWorkspaceId } from './workspace-name-form'
import { StripeConnectButton } from './stripe-connect-button'
import { BuyCreditsButton } from '../ai-clipper/buy-credits-button'

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
    .select('id, name, ai_credits, created_at')
    .eq('id', member.workspace_id)
    .single()

  if (!workspace) {
    return <div className="p-8 text-gray-500">Workspace not found.</div>
  }

  const credits = workspace.ai_credits ?? 0
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

        {/* AI Clipper credits */}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">AI Clipper credits</h2>
            <Badge variant="indigo">
              <Coins size={12} className="mr-1" />
              {credits} {credits === 1 ? 'credit' : 'credits'}
            </Badge>
          </div>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              The AI Clipper is pay-per-use: <span className="font-medium text-gray-900">1 credit = 1 clip job</span> (source
              video up to 90 min). Credits never expire.
            </p>
            <div className="shrink-0">
              <BuyCreditsButton />
            </div>
          </div>
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
