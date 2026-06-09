'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

interface Props {
  open: boolean
  onClose: () => void
  clipId: string
  clientId: string
  onPosted: () => void
}

interface PostingAccount {
  id: string
  platform: string
  handle: string
}

export function LogPostModal({ open, onClose, clipId, clientId, onPosted }: Props) {
  const [accounts, setAccounts] = useState<PostingAccount[]>([])
  const [form, setForm] = useState({ posting_account_id: '', url: '', views: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    fetch(`/api/posting-accounts?client_id=${clientId}`)
      .then(r => r.json())
      .then(d => {
        setAccounts(d.accounts ?? [])
        if (d.accounts?.length) setForm(f => ({ ...f, posting_account_id: d.accounts[0].id }))
      })
  }, [open, clientId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip_id: clipId,
          posting_account_id: form.posting_account_id,
          url: form.url || null,
          views: form.views ? parseInt(form.views) : null,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      onPosted()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log a post">
      <form onSubmit={handleSubmit} className="space-y-4">
        {accounts.length === 0 ? (
          <p className="text-sm text-gray-500">No posting accounts found for this client.</p>
        ) : (
          <>
            <Select
              label="Posted from"
              value={form.posting_account_id}
              onChange={e => setForm(f => ({ ...f, posting_account_id: e.target.value }))}
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.platform} @{a.handle}</option>
              ))}
            </Select>
            <Input
              label="Post URL"
              type="url"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://tiktok.com/..."
            />
            <Input
              label="Views (optional)"
              type="number"
              value={form.views}
              onChange={e => setForm(f => ({ ...f, views: e.target.value }))}
              placeholder="Leave blank to fill in later"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={loading}>Log post</Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}
