import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AddSourceButton } from './add-source-button'
import { ExternalLink } from 'lucide-react'

export default async function SourcesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user!.id).single()

  const { data: sources } = await supabase
    .from('sources')
    .select(`*, clients!inner(name, workspace_id)`)
    .eq('clients.workspace_id', member?.workspace_id)
    .order('received_at', { ascending: false })

  const { data: clients } = await supabase
    .from('clients').select('id, name').eq('workspace_id', member?.workspace_id).eq('status', 'active')

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sources</h1>
          <p className="text-sm text-gray-500 mt-1">VODs, livestreams, and episodes to clip from</p>
        </div>
        <AddSourceButton clients={clients ?? []} />
      </div>

      {!sources?.length ? (
        <Card className="text-center py-16">
          <div className="text-4xl mb-3">📼</div>
          <h2 className="font-semibold text-gray-900 mb-1">Add your first source</h2>
          <p className="text-sm text-gray-500">Log the VODs and episodes you&apos;re pulling clips from.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {sources.map(source => (
            <Card key={source.id} padding={false}>
              <div className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-900">{source.title}</p>
                    <SourceStatusBadge status={source.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{(source.clients as {name: string}).name} · {new Date(source.received_at).toLocaleDateString()}</p>
                </div>
                {source.url && (
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-600">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function SourceStatusBadge({ status }: { status: string }) {
  const map: Record<string, 'gray' | 'yellow' | 'green'> = { new: 'gray', in_progress: 'yellow', done: 'green' }
  const labels: Record<string, string> = { new: 'New', in_progress: 'In progress', done: 'Done' }
  return <Badge variant={map[status] ?? 'gray'}>{labels[status] ?? status}</Badge>
}
