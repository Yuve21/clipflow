'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Client { id: string; name: string }

export function AddSourceButton({ clients }: { clients: Client[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', client_id: clients[0]?.id ?? '', url: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, url: form.url || null }),
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
      <Button onClick={() => setOpen(true)}><Plus size={16} /> Add source</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add source">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. xQc Stream Jan 5 VOD" required />
          {clients.length > 0
            ? <Select label="Client *" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            : <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">No active clients yet.</p>
          }
          <Input label="URL" type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://twitch.tv/videos/..." />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading} disabled={!clients.length}>Add source</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
