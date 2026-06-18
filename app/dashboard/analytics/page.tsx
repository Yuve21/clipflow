import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { format, startOfWeek, subWeeks, startOfMonth } from 'date-fns'
import {
  Send,
  Eye,
  Calendar,
  BarChart2,
  ExternalLink,
} from 'lucide-react'

type PostRow = {
  id: string
  posted_at: string
  views: number | null
  url: string | null
  posting_accounts: { platform: string; handle: string; client_id: string } | null
  clips: { title: string } | null
}

type ClientRow = {
  id: string
  name: string
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return n.toLocaleString('en-US')
}

const platformBadge: Record<string, 'gray' | 'green' | 'red' | 'blue' | 'purple' | 'indigo'> = {
  tiktok: 'gray',
  youtube: 'red',
  instagram: 'purple',
  twitter: 'blue',
  x: 'blue',
}

export default async function AnalyticsPage() {
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

  const [{ data: postsData }, { data: clientsData }] = await Promise.all([
    supabase
      .from('posts')
      .select('id, posted_at, views, url, posting_accounts(platform, handle, client_id), clips!inner(title, clients!inner(workspace_id))')
      .eq('clips.clients.workspace_id', wsId)
      .order('posted_at', { ascending: false }),
    supabase.from('clients').select('id, name').eq('workspace_id', wsId),
  ])

  const posts = (postsData ?? []) as unknown as PostRow[]
  const clients = (clientsData ?? []) as unknown as ClientRow[]
  const clientNameById = new Map(clients.map(c => [c.id, c.name]))

  // ── Summary metrics ──────────────────────────────────────────────
  const totalPosts = posts.length
  const totalViews = posts.reduce((sum, p) => sum + (p.views ?? 0), 0)
  const monthStart = startOfMonth(new Date())
  const thisMonthPosts = posts.filter(p => new Date(p.posted_at) >= monthStart).length
  const avgViews = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0

  // ── Posts by platform ────────────────────────────────────────────
  const platformMap = new Map<string, { count: number; views: number }>()
  for (const p of posts) {
    const platform = p.posting_accounts?.platform ?? 'unknown'
    const entry = platformMap.get(platform) ?? { count: 0, views: 0 }
    entry.count += 1
    entry.views += p.views ?? 0
    platformMap.set(platform, entry)
  }
  const platforms = [...platformMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count)
  const maxPlatformCount = Math.max(1, ...platforms.map(p => p.count))

  // ── Posts by week (last 8 weeks) ─────────────────────────────────
  const now = new Date()
  const weekBuckets = Array.from({ length: 8 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(now, 7 - i))
    return {
      key: format(weekStart, 'yyyy-MM-dd'),
      label: format(weekStart, 'MMM d'),
      count: 0,
    }
  })
  const weekIndex = new Map(weekBuckets.map((b, i) => [b.key, i]))
  for (const p of posts) {
    const key = format(startOfWeek(new Date(p.posted_at)), 'yyyy-MM-dd')
    const idx = weekIndex.get(key)
    if (idx !== undefined) weekBuckets[idx].count += 1
  }
  const maxWeekCount = Math.max(1, ...weekBuckets.map(b => b.count))

  // ── Top 5 clips by views ─────────────────────────────────────────
  const clipMap = new Map<string, { views: number; posts: number }>()
  for (const p of posts) {
    const title = p.clips?.title ?? 'Untitled clip'
    const entry = clipMap.get(title) ?? { views: 0, posts: 0 }
    entry.views += p.views ?? 0
    entry.posts += 1
    clipMap.set(title, entry)
  }
  const topClips = [...clipMap.entries()]
    .map(([title, v]) => ({ title, ...v }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
  const maxClipViews = Math.max(1, ...topClips.map(c => c.views))
  const hasViewData = totalViews > 0

  // ── Top 3 clients by post count ──────────────────────────────────
  const clientMap = new Map<string, number>()
  for (const p of posts) {
    const clientId = p.posting_accounts?.client_id
    const name = clientId ? (clientNameById.get(clientId) ?? 'Unknown client') : 'Unknown client'
    clientMap.set(name, (clientMap.get(name) ?? 0) + 1)
  }
  const topClients = [...clientMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  const recentPosts = posts.slice(0, 10)

  // ── Empty state ──────────────────────────────────────────────────
  if (totalPosts === 0) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Performance across every post you&apos;ve logged.</p>
        </div>
        <Card className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
            <BarChart2 size={24} className="text-indigo-600" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-gray-900">No posts logged yet</h2>
          <p className="mt-1 text-sm text-gray-500">
            Once you start logging posts on your clips, your analytics will show up here.
          </p>
          <Link
            href="/dashboard/clips"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Go to clips
          </Link>
        </Card>
      </div>
    )
  }

  const stats = [
    { label: 'Total Posts', value: totalPosts.toLocaleString('en-US'), icon: Send, bg: 'bg-indigo-50', fg: 'text-indigo-600' },
    { label: 'Total Views', value: formatCompact(totalViews), icon: Eye, bg: 'bg-violet-50', fg: 'text-violet-600' },
    { label: 'This Month', value: thisMonthPosts.toLocaleString('en-US'), icon: Calendar, bg: 'bg-emerald-50', fg: 'text-emerald-600' },
    { label: 'Avg Views/Post', value: formatCompact(avgViews), icon: BarChart2, bg: 'bg-amber-50', fg: 'text-amber-600' },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Performance across every post you&apos;ve logged.</p>
      </div>

      {/* Section 1 — Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, bg, fg }) => (
          <Card key={label}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon size={18} className={fg} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Section 2 — Posts by week + By platform */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8 items-start">
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">Posts by week</h2>
            <span className="text-xs text-gray-400">Last 8 weeks</span>
          </div>
          <div className="flex items-end gap-2 h-32">
            {weekBuckets.map(b => (
              <div key={b.key} className="flex flex-col items-center flex-1 gap-1.5 h-full justify-end">
                <span className="text-[10px] font-semibold text-gray-600">{b.count > 0 ? b.count : ''}</span>
                <div
                  className={`w-full rounded-t ${b.count > 0 ? 'bg-indigo-500' : 'bg-gray-100'}`}
                  style={{ height: `${b.count > 0 ? Math.max(4, (b.count / maxWeekCount) * 100) : 3}%` }}
                />
                <span className="text-[9px] text-gray-400 whitespace-nowrap">{b.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">By platform</h2>
            <span className="text-xs text-gray-400">{platforms.length} platform{platforms.length === 1 ? '' : 's'}</span>
          </div>
          {platforms.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No platform data yet.</div>
          ) : (
            <div className="space-y-3">
              {platforms.map(p => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 text-right truncate capitalize">{p.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full"
                      style={{ width: `${(p.count / maxPlatformCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-24 text-right">
                    {p.count} · {formatCompact(p.views)} views
                  </span>
                </div>
              ))}
            </div>
          )}
          {topClients.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Top clients by posts</p>
              <div className="flex flex-wrap gap-2">
                {topClients.map(c => (
                  <Badge key={c.name} variant="indigo">
                    {c.name} · {c.count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Section 3 — Top clips by views */}
      <Card padding={false} className="mb-8">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Top clips by views</h2>
        </div>
        {!hasViewData ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No view data yet — add views when logging posts.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-5 py-3 font-medium w-12">#</th>
                <th className="px-5 py-3 font-medium">Clip</th>
                <th className="px-5 py-3 font-medium w-1/3">Views</th>
                <th className="px-5 py-3 font-medium text-right">Posts</th>
              </tr>
            </thead>
            <tbody>
              {topClips.map((clip, i) => (
                <tr key={clip.title} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-semibold text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-900 max-w-0 truncate">{clip.title}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full"
                          style={{ width: `${(clip.views / maxClipViews) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 w-12 text-right">
                        {formatCompact(clip.views)}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-500">{clip.posts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Section 4 — Recent posts */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent posts</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-5 py-3 font-medium">Account</th>
              <th className="px-5 py-3 font-medium">Clip</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium text-right">Views</th>
            </tr>
          </thead>
          <tbody>
            {recentPosts.map(post => {
              const account = post.posting_accounts
              return (
                <tr key={post.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {account ? (
                        <>
                          <Badge variant={platformBadge[account.platform.toLowerCase()] ?? 'gray'}>
                            <span className="capitalize">{account.platform}</span>
                          </Badge>
                          <span className="text-gray-600">@{account.handle}</span>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900 max-w-0 truncate">
                    {post.clips?.title ?? 'Untitled clip'}
                  </td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                    {format(new Date(post.posted_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center justify-end gap-2 text-gray-700">
                      {post.views !== null ? formatCompact(post.views) : '—'}
                      {post.url && (
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700"
                          aria-label="Open post"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
