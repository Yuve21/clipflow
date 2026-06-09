'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Client { id: string; name: string }

interface Props {
  clients: Client[]
  workspaceId: string
}

export function AddClipButton({ clients, workspaceId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', client_id: clients[0]?.id ?? '', due_date: '', status: 'todo' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, due_date: form.due_date || null }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} /> Add clip
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add clip">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Clip title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Streamer goes viral reaction" required />
          {clients.length > 0 ? (
            <Select label="Client *" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          ) : (
            <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">No active clients yet. Add a client first.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Select label="Starting status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="todo">To do</option>
              <option value="editing">Editing</option>
              <option value="ready">Ready</option>
            </Select>
            <Input label="Due date" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading} disabled={!clients.length}>Add clip</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
