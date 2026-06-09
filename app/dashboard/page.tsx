import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Users, Film, CheckCircle2, Clock } from 'lucide-react'

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

  const [{ count: clientCount }, { count: activeClients }, { data: clips }] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('workspace_id', wsId).eq('status', 'active'),
    supabase.from('clips').select('id, title, status, due_date, clients(name)').eq('clients.workspace_id', wsId).in('status', ['todo', 'editing', 'ready']).limit(8),
  ])

  const statusBadge = (s: string) => {
    const map: Record<string, 'yellow' | 'blue' | 'green' | 'red' | 'gray'> = {
      todo: 'gray', editing: 'yellow', ready: 'blue', posted: 'green', flagged: 'red'
    }
    return <Badge variant={map[s] ?? 'gray'}>{s}</Badge>
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back. Here&apos;s what&apos;s in flight.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg"><Users size={18} className="text-indigo-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{clientCount ?? 0}</p>
              <p className="text-xs text-gray-500">Total clients</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><CheckCircle2 size={18} className="text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeClients ?? 0}</p>
              <p className="text-xs text-gray-500">Active clients</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg"><Film size={18} className="text-yellow-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{clips?.length ?? 0}</p>
              <p className="text-xs text-gray-500">Clips in progress</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><Clock size={18} className="text-red-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {clips?.filter(c => c.due_date && new Date(c.due_date) < new Date()).length ?? 0}
              </p>
              <p className="text-xs text-gray-500">Overdue</p>
            </div>
          </div>
        </Card>
      </div>

      <Card padding={false}>
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
                  <td className="px-5 py-3 text-gray-500">{(clip.clients as unknown as {name: string} | null)?.name ?? '—'}</td>
                  <td className="px-5 py-3">{statusBadge(clip.status)}</td>
                  <td className="px-5 py-3 text-gray-500">{clip.due_date ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
