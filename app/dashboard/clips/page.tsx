import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from './kanban-board'
import { AddClipButton } from './add-clip-button'

export default async function ClipsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; view?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user!.id).single()

  const wsId = member?.workspace_id

  let clipsQuery = supabase
    .from('clips')
    .select(`
      *,
      clients!inner(id, name, workspace_id),
      posts(id, url, posted_at, posting_accounts(platform, handle))
    `)
    .eq('clients.workspace_id', wsId)
    .order('created_at', { ascending: false })

  if (sp.client) {
    clipsQuery = clipsQuery.eq('client_id', sp.client)
  }

  const { data: clips } = await clipsQuery

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, status')
    .eq('workspace_id', wsId)
    .eq('status', 'active')
    .order('name')

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clips</h1>
          <p className="text-xs text-gray-500 mt-0.5">{clips?.length ?? 0} total</p>
        </div>
        <AddClipButton clients={clients ?? []} workspaceId={wsId} />
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard clips={clips ?? []} />
      </div>
    </div>
  )
}
