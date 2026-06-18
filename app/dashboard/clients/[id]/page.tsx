import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock, Copy, ExternalLink } from 'lucide-react'
import { CopyButton } from './copy-button'
import { AddPostingAccountButton } from './add-posting-account-button'
import { PortalLinkButton } from './portal-link-button'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user!.id).single()
  if (!member) notFound()

  const { data: client } = await supabase
    .from('clients')
    .select(`
      *,
      posting_accounts(*),
      client_agreements(*),
      clips(id, title, status, created_at)
    `)
    .eq('id', id)
    .eq('workspace_id', member.workspace_id)
    .single()

  if (!client) notFound()

  const agreement = (client.client_agreements as {id: string, token: string, accepted: boolean, accepted_at: string | null, accepted_by_name: string | null, term_text: string}[])?.[0]
  const agreementUrl = agreement ? `${process.env.NEXT_PUBLIC_SITE_URL || ''}/agree/${agreement.token}` : null
  const portalUrl = client.portal_token ? `${process.env.NEXT_PUBLIC_SITE_URL || ''}/portal/${client.portal_token}` : null
  const postingAccounts = client.posting_accounts as {id: string, platform: string, handle: string, follower_count: number}[]
  const clips = client.clips as {id: string, title: string, status: string, created_at: string}[]

  const statusCounts = clips.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/clients" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={14} /> All clients
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              {client.status === 'active'
                ? <Badge variant="green"><CheckCircle2 size={10} className="inline mr-1" />Active</Badge>
                : <Badge variant="yellow"><Clock size={10} className="inline mr-1" />Pending agreement</Badge>
              }
            </div>
            <p className="text-sm text-gray-500">
              {client.source_platform && <span className="mr-3">{client.source_platform}</span>}
              {client.rate_type === 'per_clip' && client.rate_amount && <span>${client.rate_amount}/clip</span>}
              {client.rate_type === 'retainer' && client.rate_amount && <span>${client.rate_amount}/{client.retainer_period}</span>}
            </p>
          </div>
          <Link href={`/dashboard/clips?client=${id}`}>
            <Button variant="secondary" size="sm">View clips</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Agreement */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-3">Agreement</h2>
          {agreement?.accepted ? (
            <div>
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium mb-1">
                <CheckCircle2 size={14} /> Accepted
              </div>
              <p className="text-xs text-gray-500">
                By {agreement.accepted_by_name} on {new Date(agreement.accepted_at!).toLocaleDateString('en-US', { dateStyle: 'long' })}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-3">Not yet accepted. Share this link with {client.name}:</p>
              {agreementUrl && (
                <div className="flex gap-2">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 font-mono truncate">
                    {agreementUrl}
                  </div>
                  <CopyButton text={agreementUrl} />
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Stats */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-3">Clips</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            {['todo', 'editing', 'ready', 'posted', 'flagged'].map(s => (
              <div key={s} className="bg-gray-50 rounded-lg p-2">
                <p className="text-xl font-bold text-gray-900">{statusCounts[s] || 0}</p>
                <p className="text-xs text-gray-500 capitalize">{s}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Portal link */}
      {portalUrl && client.portal_token && (
        <Card className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Portal link</h2>
            <PortalLinkButton portalToken={client.portal_token as string} />
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Share this read-only dashboard with {client.name} — no login required.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 font-mono truncate">
            {portalUrl}
          </div>
        </Card>
      )}

      {/* Posting accounts */}
      <Card className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Posting accounts</h2>
          <AddPostingAccountButton clientId={client.id} />
        </div>
        {!postingAccounts?.length ? (
          <p className="text-sm text-gray-400">No posting accounts yet.</p>
        ) : (
          <div className="space-y-2">
            {postingAccounts.map(pa => (
              <div key={pa.id} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">@{pa.handle}</span>
                  <Badge variant="gray">{pa.platform}</Badge>
                </div>
                <span className="text-gray-500">{formatFollowers(pa.follower_count)} followers</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Brand notes */}
      {client.brand_notes && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-2">Brand notes</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.brand_notes}</p>
        </Card>
      )}
    </div>
  )
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}
