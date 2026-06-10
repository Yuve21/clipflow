import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import {
  Film,
  Clock,
  CheckCircle2,
  Send,
  Eye,
  ExternalLink,
  TriangleAlert,
  CalendarDays,
  Receipt,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type PortalAccount = {
  id: string
  platform: string
  handle: string
  follower_count: number
}

type PortalPost = {
  id: string
  url: string | null
  posted_at: string | null
  views: number | null
  posting_accounts: PortalAccount | null
}

type ClipStatus = 'todo' | 'editing' | 'ready' | 'posted' | 'flagged'

type PortalClip = {
  id: string
  title: string
  status: ClipStatus
  due_date: string | null
  created_at: string
  posts: PortalPost[]
}

type PortalInvoice = {
  id: string
  period_start: string
  period_end: string
  total: number
  status: 'draft' | 'sent' | 'paid'
  stripe_payment_link: string | null
}

const statusPillClasses: Record<ClipStatus, string> = {
  todo: 'bg-slate-100 text-slate-600',
  editing: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  posted: 'bg-sky-100 text-sky-700',
  flagged: 'bg-rose-100 text-rose-700',
}

const statusLabels: Record<ClipStatus, string> = {
  todo: 'Queued',
  editing: 'Editing',
  ready: 'Ready',
  posted: 'Posted',
  flagged: 'On hold',
}

function StatusPill({ status }: { status: ClipStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusPillClasses[status]}`}>
      {statusLabels[status]}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// period_start/end are plain `date` columns — parse as local to avoid TZ shifts
function formatDateOnly(dateStr: string) {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export default async function ClientPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ paid?: string }>
}) {
  const [{ token }, { paid }] = await Promise.all([params, searchParams])
  const admin = createAdminClient()

  const { data: client } = await admin
    .from('clients')
    .select(`*, posting_accounts(*), clips(*, posts(*, posting_accounts(*))), invoices(id, period_start, period_end, total, status, stripe_payment_link)`)
    .eq('portal_token', token)
    .single()

  if (!client) notFound()

  const accounts = (client.posting_accounts ?? []) as PortalAccount[]
  const clips = (client.clips ?? []) as PortalClip[]
  const invoices = (client.invoices ?? []) as unknown as PortalInvoice[]
  const payableInvoices = invoices
    .filter(inv => inv.status === 'sent' && inv.stripe_payment_link)
    .sort((a, b) => b.period_end.localeCompare(a.period_end))
  const justPaid = paid === '1'

  const inProgress = clips
    .filter(c => c.status === 'todo' || c.status === 'editing')
    .sort((a, b) => {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
      if (a.due_date) return -1
      if (b.due_date) return 1
      return a.created_at.localeCompare(b.created_at)
    })
  const ready = clips.filter(c => c.status === 'ready')
  const posted = clips
    .filter(c => c.status === 'posted')
    .sort((a, b) => {
      const aDate = a.posts.map(p => p.posted_at || '').sort().pop() || a.created_at
      const bDate = b.posts.map(p => p.posted_at || '').sort().pop() || b.created_at
      return bDate.localeCompare(aDate)
    })
  const flagged = clips.filter(c => c.status === 'flagged')

  const stats = [
    { label: 'Total clips', value: clips.length, icon: Film, iconClasses: 'bg-violet-50 text-violet-500' },
    { label: 'In progress', value: inProgress.length, icon: Clock, iconClasses: 'bg-amber-50 text-amber-500' },
    { label: 'Ready to post', value: ready.length, icon: CheckCircle2, iconClasses: 'bg-emerald-50 text-emerald-500' },
    { label: 'Posted', value: posted.length, icon: Send, iconClasses: 'bg-sky-50 text-sky-500' },
  ]

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <meta httpEquiv="refresh" content="300" />
      <title>{`${client.name} · Content Pipeline`}</title>

      {/* Payment success banner */}
      {justPaid && (
        <div className="mb-8 flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-emerald-700 font-medium">
          <CheckCircle2 size={18} className="shrink-0" />
          Payment received — thank you!
        </div>
      )}

      {/* Header */}
      <header className="mb-10">
        <div className="flex justify-end mb-4">
          <span className="text-[11px] font-medium text-gray-400 bg-white border border-gray-100 rounded-full px-2.5 py-1">
            Powered by ClipFlow
          </span>
        </div>
        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-2">Content pipeline</p>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{client.name}</h1>
          {client.status === 'active' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={12} /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              <Clock size={12} /> Pending
            </span>
          )}
        </div>
        {accounts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {accounts.map(a => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-sm text-gray-700"
              >
                <span className="text-xs text-gray-400 capitalize">{a.platform}</span>
                <span className="font-medium">@{a.handle}</span>
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Stats row */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${s.iconClasses}`}>
              <s.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </section>

      {clips.length === 0 ? (
        <section className="bg-white rounded-2xl border border-gray-100 p-10 text-center mb-12">
          <Film size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nothing in the pipeline yet — new clips will show up here.</p>
        </section>
      ) : (
        <div className="space-y-10 mb-12">
          {/* In progress */}
          {inProgress.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-400 mb-3">In progress</h2>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {inProgress.map(clip => (
                  <div key={clip.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-4">
                    <p className="flex-1 font-medium text-gray-900">{clip.title}</p>
                    <div className="flex items-center gap-3">
                      {clip.due_date && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <CalendarDays size={12} /> Due {formatDate(clip.due_date)}
                        </span>
                      )}
                      <StatusPill status={clip.status} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Ready to post */}
          {ready.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-400 mb-3">Ready to post</h2>
              <div className="space-y-2">
                {ready.map(clip => (
                  <div
                    key={clip.id}
                    className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 border-l-4 border-l-emerald-300 px-5 py-4"
                  >
                    <p className="flex-1 font-medium text-gray-900">{clip.title}</p>
                    <StatusPill status="ready" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Posted */}
          {posted.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-400 mb-3">Posted</h2>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {posted.map(clip => {
                  const totalViews = clip.posts.reduce((sum, p) => sum + (p.views || 0), 0)
                  const latestPostedAt = clip.posts.map(p => p.posted_at).filter(Boolean).sort().pop()
                  const platforms = Array.from(
                    new Set(clip.posts.map(p => p.posting_accounts?.platform).filter(Boolean))
                  ) as string[]
                  const links = clip.posts.filter(p => p.url)
                  return (
                    <div key={clip.id} className="px-5 py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <p className="flex-1 font-medium text-gray-900">{clip.title}</p>
                        <div className="flex flex-wrap items-center gap-3">
                          {platforms.map(platform => (
                            <span
                              key={platform}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500 capitalize"
                            >
                              {platform}
                            </span>
                          ))}
                          {totalViews > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <Eye size={13} /> {formatViews(totalViews)} views
                            </span>
                          )}
                          {latestPostedAt && (
                            <span className="text-xs text-gray-400">{formatDate(latestPostedAt)}</span>
                          )}
                          {links.map(p => (
                            <a
                              key={p.id}
                              href={p.url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-300 hover:text-sky-500 transition-colors"
                              title="View post"
                            >
                              <ExternalLink size={14} />
                            </a>
                          ))}
                          <StatusPill status="posted" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Flagged */}
          {flagged.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-400 mb-3">Needs attention</h2>
              <div className="bg-rose-50/50 rounded-2xl border border-rose-100 divide-y divide-rose-100/60">
                {flagged.map(clip => (
                  <div key={clip.id} className="flex items-center gap-3 px-5 py-4">
                    <TriangleAlert size={15} className="text-rose-400 shrink-0" />
                    <p className="flex-1 font-medium text-gray-900">{clip.title}</p>
                    <StatusPill status="flagged" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Open invoices */}
      {payableInvoices.length > 0 && (
        <section className="mb-12">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-400 mb-3">Invoices due</h2>
          <div className="space-y-3">
            {payableInvoices.map(invoice => (
              <div
                key={invoice.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white rounded-2xl border border-gray-100 px-5 py-4"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 shrink-0">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{currency.format(Number(invoice.total))}</p>
                    <p className="text-xs text-gray-400">
                      {formatDateOnly(invoice.period_start)} – {formatDateOnly(invoice.period_end)}
                    </p>
                  </div>
                </div>
                <a
                  href={invoice.stripe_payment_link!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold transition-colors"
                >
                  Pay now →
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100 pt-8 text-center">
        <p className="text-sm text-gray-400">
          This portal is maintained by your content partner. Questions? Reach out directly.
        </p>
      </footer>
    </div>
  )
}
