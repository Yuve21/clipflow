'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Plus, X, Plus as PlusIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  workspaceId: string
}

interface PostingAccountDraft {
  platform: string
  handle: string
  follower_count: string
}

export function AddClientButton({ workspaceId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    source_platform: '',
    rate_type: 'per_clip',
    rate_amount: '',
    retainer_period: '',
    deliverables_per_period: '',
    brand_notes: '',
  })

  const [accounts, setAccounts] = useState<PostingAccountDraft[]>([
    { platform: 'TikTok', handle: '', follower_count: '' },
  ])

  function updateAccount(i: number, field: keyof PostingAccountDraft, value: string) {
    setAccounts(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a))
  }

  function addAccount() {
    setAccounts(prev => [...prev, { platform: 'TikTok', handle: '', follower_count: '' }])
  }

  function removeAccount(i: number) {
    setAccounts(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          workspace_id: workspaceId,
          rate_amount: form.rate_amount ? parseFloat(form.rate_amount) : null,
          deliverables_per_period: form.deliverables_per_period ? parseInt(form.deliverables_per_period) : null,
          posting_accounts: accounts.filter(a => a.handle).map(a => ({
            ...a,
            follower_count: parseInt(a.follower_count) || 0,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create client')
      }

      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} />
        Add client
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add client" className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Client name *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. xQc, Lex Fridman Podcast"
            required
          />
          <Input
            label="Source platform"
            value={form.source_platform}
            onChange={e => setForm(f => ({ ...f, source_platform: e.target.value }))}
            placeholder="e.g. Twitch, YouTube"
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Rate type"
              value={form.rate_type}
              onChange={e => setForm(f => ({ ...f, rate_type: e.target.value }))}
            >
              <option value="per_clip">Per clip</option>
              <option value="retainer">Retainer</option>
            </Select>
            <Input
              label={form.rate_type === 'per_clip' ? 'Rate per clip ($)' : 'Retainer amount ($)'}
              type="number"
              min="0"
              step="0.01"
              value={form.rate_amount}
              onChange={e => setForm(f => ({ ...f, rate_amount: e.target.value }))}
              placeholder="0.00"
            />
          </div>

          {form.rate_type === 'retainer' && (
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Retainer period"
                value={form.retainer_period}
                onChange={e => setForm(f => ({ ...f, retainer_period: e.target.value }))}
              >
                <option value="">Select…</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </Select>
              <Input
                label="Clips per period"
                type="number"
                min="1"
                value={form.deliverables_per_period}
                onChange={e => setForm(f => ({ ...f, deliverables_per_period: e.target.value }))}
                placeholder="e.g. 20"
              />
            </div>
          )}

          {/* Posting accounts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Posting accounts</label>
              <button type="button" onClick={addAccount} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                <PlusIcon size={12} /> Add account
              </button>
            </div>
            <div className="space-y-2">
              {accounts.map((acc, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Select
                    value={acc.platform}
                    onChange={e => updateAccount(i, 'platform', e.target.value)}
                    className="w-28"
                  >
                    <option>TikTok</option>
                    <option>Instagram</option>
                    <option>YouTube</option>
                    <option>Twitter/X</option>
                    <option>Other</option>
                  </Select>
                  <Input
                    value={acc.handle}
                    onChange={e => updateAccount(i, 'handle', e.target.value)}
                    placeholder="@handle"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={acc.follower_count}
                    onChange={e => updateAccount(i, 'follower_count', e.target.value)}
                    placeholder="Followers"
                    className="w-28"
                  />
                  {accounts.length > 1 && (
                    <button type="button" onClick={() => removeAccount(i)} className="mt-2 text-gray-400 hover:text-red-500">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Input
            label="Brand notes"
            value={form.brand_notes}
            onChange={e => setForm(f => ({ ...f, brand_notes: e.target.value }))}
            placeholder="Things to know about posting style, restrictions…"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create client + send agreement</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
