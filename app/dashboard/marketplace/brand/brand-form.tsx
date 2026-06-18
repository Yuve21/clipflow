'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Category { slug: string; label: string }
interface Initial {
  name: string
  tagline: string
  website: string
  description: string
  logo_url: string
  is_listed: boolean
  categories: string[]
}

export function BrandForm({ categories, initial }: { categories: Category[]; initial: Initial }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: initial.name,
    tagline: initial.tagline,
    website: initial.website,
    description: initial.description,
    logo_url: initial.logo_url,
  })
  const [isListed, setIsListed] = useState(initial.is_listed)
  const [selected, setSelected] = useState<string[]>(initial.categories)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }
  function toggleCat(slug: string) {
    setSelected((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Brand name is required')
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/brand', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, is_listed: isListed, categories: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save brand')
      setSaved(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-5">
        <Input label="Brand name *" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Acme Inc." />
        <Input label="Tagline" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="The fastest energy drink on earth" />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Website" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" />
          <Input label="Logo URL" value={form.logo_url} onChange={(e) => set('logo_url', e.target.value)} placeholder="https://…/logo.png" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">About the brand</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            placeholder="Who you are, what you sell, and what kind of promotion you're after."
            className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Your niches</label>
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

        <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer">
          <input type="checkbox" checked={isListed} onChange={(e) => setIsListed(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          <span className="text-sm">
            <span className="font-medium text-gray-900">List my brand in the directory</span>
            <span className="block text-gray-500">Clippers can browse your profile and apply to your campaigns.</span>
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Brand profile saved.</p>}

        <div className="flex justify-end pt-2">
          <Button type="submit" loading={saving}>Save brand profile</Button>
        </div>
      </form>
    </Card>
  )
}
