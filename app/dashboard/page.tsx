import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Users,
  Film,
  Clock,
  DollarSign,
  UserPlus,
  Sparkles,
  Receipt,
  ExternalLink,
} from 'lucide-react'

function formatMoney(amount: number) {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const quickActions = [
  { href: '/dashboard/clients', label: 'Add client', icon: UserPlus },
  { href: '/dashboard/clips', label: 'New clip', icon: Film },
  { href: '/dashboard/ai-clipper', label: 'Run AI Clipper', icon: Sparkles },
  { href: '/dashboard/invoices', label: 'Create invoice', icon: Receipt },
]

const onboardingSteps: {
  step: number
  title: string
  description?: string
  cta?: { href: string; label: string }
}[] = [
  {
    step: 1,
    title: 'Add your first client',
    cta: { href: '/dashboard/clients', label: 'Add client' },
  },
  {
    step: 2,
    title: 'Share their agreement link',
    description: 'They sign once. You post forever.',
  },
  {
    step: 3,
    title: 'Start clipping',
    description: 'Add clips to the kanban and track every post.',
  },
]

export default async function DashboardPage() {
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

  const wsId = member.workspace_id
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { count: clientCount },
    { count: activeClients },
    { data: clips },
    { count: overdueCount },
    { data: paidData },
    { data: outstandingData },
    { data: recentPosts },
    { count: aiJobsThisMonth },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', wsId),
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', wsId)
      .eq('status', 'active'),
    supabase
      .from('clips')
      .select('id, title, status, due_date, clients!inner(name, workspace_id)')
      .eq('clients.workspace_id', wsId)
      .in('status', ['todo', 'editing', 'ready'])
      .limit(6),
    supabase
      .from('clips')
      .select('id, clients!inner(workspace_id)', { count: 'exact', head: true })
      .eq('clients.workspace_id', wsId)
      .in('status', ['todo', 'editing', 'ready'])
      .lt('due_date', today),
    supabase
      .from('invoices')
      .select('total, clients!inner(workspace_id)')
      .eq('clients.workspace_id', wsId)
      .eq('status', 'paid'),
    supabase
      .from('invoices')
      .select('total, clients!inner(workspace_id)')
      .eq('clients.workspace_id', wsId)
      .eq('status', 'sent'),
    supabase
      .from('posts')
      .select('id, views, url, posted_at, clips!inner(title, clients!inner(workspace_id))')
      .eq('clips.clients.workspace_id', wsId)
      .order('posted_at', { ascending: false })
      .limit(5),
    supabase
      .from('ai_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', wsId)
      .gte('created_at', monthStart),
  ])

  const totalPaid = paidData?.reduce((sum, r) => sum + Number(r.total), 0) ?? 0
  const totalOutstanding = outstandingData?.reduce((sum, r) => sum + Number(r.total), 0) ?? 0

  const statusBadge = (s: string) => {
    const map: Record<string, 'yellow' | 'blue' | 'green' | 'red' | 'gray'> = {
      todo: 'gray', editing: 'yellow', ready: 'blue', posted: 'green', flagged: 'red'
    }
    return <Badge variant={map[s] ?? 'gray'}>{s}</Badge>
  }

  // Brand-new workspace: show onboarding instead of empty stats
  if ((clientCount ?? 0) === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>

        <Card className="px-6 py-12 text-center sm:px-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-3xl">
            <span aria-hidden="true">🎬</span>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">Welcome to ClipFlow</h2>
          <p className="mt-2 text-gray-500">
            You&apos;re 3 steps away from your first automated clip pipeline.
          </p>

          <div className="mt-10 grid gap-4 text-left md:grid-cols-3">
            {onboardingSteps.map(({ step, title, description, cta }) => (
              <div
                key={step}
                className="flex flex-col rounded-xl border border-gray-100 bg-gray-50/50 p-5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
                  {step}
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
                {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
                {cta && (
                  <Link
                    href={cta.href}
                    className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                  >
                    <UserPlus size={14} />
                    {cta.label}
                  </Link>
                )}
              </div>
            ))}
          </div>

          <p className="mt-10 text-sm text-gray-500">
            Already have a video?{' '}
            <Link
              href="/dashboard/ai-clipper"
              className="font-medium text-indigo-600 hover:underline"
            >
              Try the AI Clipper →
            </Link>
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back. Here&apos;s what&apos;s in flight.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg"><Users size={18} className="text-indigo-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeClients ?? 0}</p>
              <p className="text-xs text-gray-500">Active clients{clientCount ? ` of ${clientCount}` : ''}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg"><Film size={18} className="text-yellow-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{clips?.length ?? 0}</p>
              <p className="text-xs text-gray-500">
                Clips in progress{(overdueCount ?? 0) > 0 ? ` · ${overdueCount} overdue` : ''}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><DollarSign size={18} className="text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(totalPaid)}</p>
              <p className="text-xs text-gray-500">Earned</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><Clock size={18} className="text-red-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(totalOutstanding)}</p>
              <p className="text-xs text-gray-500">Outstanding</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Clips table + recent posts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8 items-start">
        <Card padding={false} className="lg:col-span-2">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Clips in progress</h2>
            <Link href="/dashboard/clips" className="text-sm text-indigo-600 hover:underline">View all</Link>
          </div>
          {!clips?.length ? (
            <div className="p-8 text-center text-sm text-gray-400">No clips in progress yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">Clip</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {clips.map(clip => (
                  <tr key={clip.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-900">{clip.title}</td>
                    <td className="px-5 py-3 text-gray-500">{(clip.clients as unknown as { name: string } | null)?.name ?? '—'}</td>
                    <td className="px-5 py-3">{statusBadge(clip.status)}</td>
                    <td className="px-5 py-3 text-gray-500">{clip.due_date ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card padding={false}>
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent posts</h2>
          </div>
          {!recentPosts?.length ? (
            <div className="p-8 text-center text-sm text-gray-400">Nothing posted yet.</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentPosts.map(post => (
                <li key={post.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {(post.clips as unknown as { title: string } | null)?.title ?? 'Untitled clip'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(post.views ?? 0).toLocaleString('en-US')} views
                    </p>
                  </div>
                  {post.url && (
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                    >
                      view
                      <ExternalLink size={12} />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Quick actions</h2>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col items-center gap-3 rounded-xl border border-gray-100 p-5 text-center transition-colors hover:border-indigo-200 hover:bg-indigo-50/50"
            >
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center transition-colors group-hover:bg-indigo-100">
                <Icon size={18} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                {href === '/dashboard/ai-clipper' && (
                  <p className="text-xs text-gray-400 mt-0.5">{aiJobsThisMonth ?? 0} jobs this month</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
