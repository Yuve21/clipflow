'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Rocket } from 'lucide-react'

export function BoostProfileButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function boost() {
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/boost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Boost failed')
      setDone(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shrink-0 text-right">
      <Button variant="secondary" size="sm" loading={busy} onClick={boost} disabled={done}>
        <Rocket size={14} /> {done ? 'Profile boosted' : 'Boost profile · 5 credits'}
      </Button>
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
