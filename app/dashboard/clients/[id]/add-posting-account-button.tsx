'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function AddPostingAccountButton({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ platform: 'TikTok', handle: '', follower_count: '' })
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/posting-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, ...form, follower_count: parseInt(form.follower_count) || 0 }),
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
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} /> Add account
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add posting account">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Platform" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
            <option>TikTok</option><option>Instagram</option><option>YouTube</option><option>Twitter/X</option><option>Other</option>
          </Select>
          <Input label="Handle" value={form.handle} onChange={e => setForm(f => ({ ...f, handle: e.target.value }))} placeholder="@handle" required />
          <Input label="Follower count" type="number" value={form.follower_count} onChange={e => setForm(f => ({ ...f, follower_count: e.target.value }))} placeholder="12000" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Add account</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
