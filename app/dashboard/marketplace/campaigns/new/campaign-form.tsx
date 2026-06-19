'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

interface Category { slug: string; label: string }

const PAYOUT_HINT: Record<string, string> = {
  per_post: 'Paid per approved post',
  per_1k_views: 'Paid per 1,000 views',
  flat: 'One flat fee for the deliverable',
}

export function CampaignForm({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [form, setForm] = useState({
    brand_name: '',
    title: '',
    description: '',
    promo_type: 'product',
    payout_model: 'per_post',
    payout: '',
    budget: '',
    asset_url: '',
  })
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<null | 'draft' | 'active'>(null)

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }
  function toggleCat(slug: string) {
    setSelected((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]))
  }

  async function submit(status: 'draft' | 'active') {
    setError('')
    if (!form.title.trim()) return setError('Campaign title is required')
    setSaving(status)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          status,
          payout_cents: Math.round((parseFloat(form.payout) || 0) * 100),
          budget_cents: Math.round((parseFloat(form.budget) || 0) * 100),
          categories: selected,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create campaign')
      router.push('/dashboard/marketplace')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(null)
    }
  }

  return (
    <Card>
      <form onSubmit={(e) => { e.preventDefault(); submit('active') }} className="space-y-5">
        <Input label="Brand name" value={form.brand_name} onChange={(e) => set('brand_name', e.target.value)} placeholder="Acme Inc." hint="Only needed the first time — we'll reuse your brand profile after that." />
        <Input label="Campaign title *" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Promote our new energy drink" />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            placeholder="What should clippers know? Tone, do's and don'ts, links…"
            className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select label="What are you promoting?" value={form.promo_type} onChange={(e) => set('promo_type', e.target.value)}>
            <option value="product">Product</option>
            <option value="service">Service</option>
            <option value="business">Business</option>
            <option value="music">Music</option>
            <option value="content">Content</option>
          </Select>
          <Input label="Asset / link" value={form.asset_url} onChange={(e) => set('asset_url', e.target.value)} placeholder="https://…" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Payout model" value={form.payout_model} onChange={(e) => set('payout_model', e.target.value)}>
            <option value="per_post">Per post</option>
            <option value="per_1k_views">Per 1k views</option>
            <option value="flat">Flat fee</option>
          </Select>
          <Input label="Payout (USD)" type="number" min="0" step="0.01" value={form.payout} onChange={(e) => set('payout', e.target.value)} hint={PAYOUT_HINT[form.payout_model]} placeholder="25" />
        </div>

        <Input label="Total budget (USD, optional)" type="number" min="0" step="0.01" value={form.budget} onChange={(e) => set('budget', e.target.value)} placeholder="500" />

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Target categories</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = selected.includes(c.slug)
              return (
                <button
                  type="button"
                  key={c.slug}
                  onClick={() => toggleCat(c.slug)}
                  className={
                    on
                      ? 'rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white'
                      : 'rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50'
                  }
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" loading={saving === 'draft'} onClick={() => submit('draft')}>
            Save draft
          </Button>
          <Button type="submit" loading={saving === 'active'}>
            Publish campaign
          </Button>
        </div>
      </form>
    </Card>
  )
}
