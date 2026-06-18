'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Category { slug: string; label: string }
interface Initial {
  display_name: string
  bio: string
  min_rate: string
  is_listed: boolean
  categories: string[]
}

export function ProfileForm({ categories, initial }: { categories: Category[]; initial: Initial }) {
  const router = useRouter()
  const [form, setForm] = useState({
    display_name: initial.display_name,
    bio: initial.bio,
    min_rate: initial.min_rate,
  })
  const [isListed, setIsListed] = useState(initial.is_listed)
  const [selected, setSelected] = useState<string[]>(initial.categories)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  function toggleCat(slug: string) {
    setSelected((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.display_name.trim()) return setError('Display name is required')
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/clipper-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: form.display_name,
          bio: form.bio,
          min_rate_cents: form.min_rate ? Math.round(parseFloat(form.min_rate) * 100) : null,
          is_listed: isListed,
          categories: selected,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save profile')
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
        <Input label="Display name *" value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} placeholder="Your clip studio name" />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            rows={3}
            placeholder="What kind of clipping do you do? Notable results, turnaround, platforms…"
            className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <Input label="Minimum rate per deliverable (USD, optional)" type="number" min="0" step="0.01" value={form.min_rate} onChange={(e) => setForm((f) => ({ ...f, min_rate: e.target.value }))} placeholder="25" />

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Your content niches</label>
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
            <span className="font-medium text-gray-900">List me in the marketplace</span>
            <span className="block text-gray-500">Brands can discover your profile and invite you to campaigns.</span>
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Profile saved.</p>}

        <div className="flex justify-end pt-2">
          <Button type="submit" loading={saving}>Save profile</Button>
        </div>
      </form>
    </Card>
  )
}
