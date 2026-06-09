import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AddClientButton } from './add-client-button'
import { Plus, ExternalLink, CheckCircle2, Clock } from 'lucide-react'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user!.id)
    .single()

  const wsId = member?.workspace_id

  const { data: clients } = await supabase
    .from('clients')
    .select(`
      *,
      posting_accounts(id, platform, handle, follower_count),
      client_agreements(id, token, accepted, accepted_at)
    `)
    .eq('workspace_id', wsId)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">{clients?.length ?? 0} total</p>
        </div>
        <AddClientButton workspaceId={wsId} />
      </div>

      {!clients?.length ? (
        <Card className="text-center py-16">
          <div className="text-4xl mb-3">🎬</div>
          <h2 className="font-semibold text-gray-900 mb-1">Add your first client</h2>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">Register a streamer or podcaster, add the posting accounts you'll use, and send them the one-click agreement.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {clients.map(client => {
            const agreement = (client.client_agreements as {id: string, token: string, accepted: boolean, accepted_at: string | null}[])?.[0]
            const agreementUrl = agreement ? `/agree/${agreement.token}` : null
            return (
              <Card key={client.id} padding={false}>
                <div className="flex items-start justify-between p-5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                      >
                        {client.name}
                      </Link>
                      <StatusBadge status={client.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      {client.source_platform && <span>{client.source_platform}</span>}
                      {client.rate_type === 'per_clip' && client.rate_amount && (
                        <span>${client.rate_amount}/clip</span>
                      )}
                      {client.rate_type === 'retainer' && client.rate_amount && (
                        <span>${client.rate_amount}/{client.retainer_period}</span>
                      )}
                      {(client.posting_accounts as {id: string}[])?.length > 0 && (
                        <span>{(client.posting_accounts as {id: string}[]).length} posting account{(client.posting_accounts as {id: string}[]).length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {/* Posting accounts chips */}
                    {(client.posting_accounts as {id: string, platform: string, handle: string, follower_count: number}[])?.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {(client.posting_accounts as {id: string, platform: string, handle: string, follower_count: number}[]).map(pa => (
                          <span key={pa.id} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {pa.platform} @{pa.handle} · {formatFollowers(pa.follower_count)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {client.status === 'pending_agreement' && agreementUrl && (
                      <a
                        href={agreementUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-indigo-600 border border-indigo-200 rounded-lg px-2.5 py-1.5 hover:bg-indigo-50 transition-colors"
                      >
                        <ExternalLink size={12} />
                        Agreement link
                      </a>
                    )}
                    <Link href={`/dashboard/clients/${client.id}`}>
                      <Button variant="secondary" size="sm">Manage</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') return <Badge variant="green"><CheckCircle2 size={10} className="inline mr-1" />Active</Badge>
  return <Badge variant="yellow"><Clock size={10} className="inline mr-1" />Pending agreement</Badge>
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}
