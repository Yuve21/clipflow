import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ExternalLink, Film, Upload } from 'lucide-react'
import { EditableTitle, StatusSelect, LogPostButton, EditClipForm } from './detail-client'

type ClipStatus = 'todo' | 'editing' | 'ready' | 'posted' | 'flagged'

interface ClipDetail {
  id: string
  client_id: string
  source_id: string | null
  title: string
  status: ClipStatus
  due_date: string | null
  current_version_id: string | null
  created_at: string
  clients: { id: string; name: string; workspace_id: string }
  sources: { title: string | null; url: string | null } | null
  clip_versions: { id: string; version_no: number; file_url: string | null; uploaded_at: string }[]
  posts: {
    id: string
    url: string | null
    posted_at: string
    views: number | null
    posting_accounts: { platform: string; handle: string } | null
  }[]
}

const STATUS_META: Record<ClipStatus, { label: string; color: 'gray' | 'yellow' | 'blue' | 'green' | 'red' }> = {
  todo: { label: 'To do', color: 'gray' },
  editing: { label: 'Editing', color: 'yellow' },
  ready: { label: 'Ready', color: 'blue' },
  posted: { label: 'Posted', color: 'green' },
  flagged: { label: 'Flagged', color: 'red' },
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  // Date-only strings ("YYYY-MM-DD") are parsed as UTC midnight; split to avoid timezone shifts
  const dateOnly = value.split('T')[0]
  const [year, month, day] = dateOnly.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function ClipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user!.id).single()
  if (!member) notFound()

  const { data } = await supabase
    .from('clips')
    .select('*, clients!inner(id, name, workspace_id), sources(title, url), clip_versions(*), posts(*, posting_accounts(platform, handle))')
    .eq('id', id)
    .eq('clients.workspace_id', member.workspace_id)
    .single()

  if (!data) notFound()
  const clip = data as unknown as ClipDetail

  const posts = [...(clip.posts ?? [])].sort(
    (a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()
  )
  const versions = [...(clip.clip_versions ?? [])].sort((a, b) => b.version_no - a.version_no)
  const statusMeta = STATUS_META[clip.status]

  return (
    <div className="mx-auto max-w-6xl px-8 py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/dashboard/clips"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600"
        >
          <ArrowLeft size={14} />
          Back to Clips
        </Link>
        <StatusSelect clipId={clip.id} status={clip.status} />
      </div>

      <EditableTitle clipId={clip.id} title={clip.title} />
      <p className="mt-1 text-sm text-gray-500">
        {clip.clients.name} · Created {formatDate(clip.created_at)}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left column — 60% */}
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Post log</h2>
              <LogPostButton clipId={clip.id} clientId={clip.client_id} status={clip.status} />
            </div>
            {posts.length === 0 ? (
              <p className="text-sm text-gray-400">No posts logged yet.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {posts.map(post => (
                  <li key={post.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {post.posting_accounts
                          ? `${post.posting_accounts.platform} @${post.posting_accounts.handle}`
                          : 'Unknown account'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(post.posted_at)}
                        {post.views != null && ` · ${post.views.toLocaleString()} views`}
                      </p>
                    </div>
                    {post.url && (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded p-1 text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
                        aria-label="Open post"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Versions</h2>
              <span title="Upload from Clips page">
                <Button size="sm" variant="secondary" disabled className="pointer-events-none">
                  <Upload size={14} />
                  Upload version
                </Button>
              </span>
            </div>
            {versions.length === 0 ? (
              <p className="text-sm text-gray-400">No versions uploaded.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {versions.map(version => (
                  <li key={version.id} className="flex items-center gap-3 py-2.5">
                    <Film size={14} className="shrink-0 text-gray-300" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        Version {version.version_no}
                        {version.id === clip.current_version_id && (
                          <Badge variant="indigo">Current</Badge>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">Uploaded {formatDate(version.uploaded_at)}</p>
                    </div>
                    {version.file_url && (
                      <a
                        href={version.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded p-1 text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
                        aria-label="Open file"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right column — 40% */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Details</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Status</dt>
                <dd><Badge variant={statusMeta.color}>{statusMeta.label}</Badge></dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Client</dt>
                <dd>
                  <Link
                    href={`/dashboard/clips?client=${clip.clients.id}`}
                    className="font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    {clip.clients.name}
                  </Link>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Due date</dt>
                <dd className="text-gray-900">{formatDate(clip.due_date)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Source</dt>
                <dd className="max-w-[60%] truncate text-right text-gray-900">
                  {clip.sources?.url ? (
                    <a
                      href={clip.sources.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      {clip.sources.title ?? 'Source'}
                    </a>
                  ) : (
                    clip.sources?.title ?? '—'
                  )}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Edit</h2>
            <EditClipForm
              key={`${clip.title}-${clip.due_date ?? ''}`}
              clipId={clip.id}
              title={clip.title}
              dueDate={clip.due_date}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
