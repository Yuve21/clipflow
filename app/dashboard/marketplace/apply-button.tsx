'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import type { ParticipationStatus } from '@/types/database'

export function ApplyButton({
  campaignId,
  isOwn,
  applied,
}: {
  campaignId: string
  isOwn: boolean
  applied?: ParticipationStatus
}) {
  const [state, setState] = useState<ParticipationStatus | 'idle' | 'loading'>(applied ?? 'idle')
  const [error, setError] = useState('')

  if (isOwn) {
    return <span className="text-xs font-medium text-gray-400">Your campaign</span>
  }

  if (state !== 'idle' && state !== 'loading') {
    const label = state === 'applied' ? 'Applied' : state === 'approved' || state === 'active' ? 'Approved' : state === 'rejected' ? 'Not selected' : 'Done'
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
        <Check size={13} /> {label}
      </span>
    )
  }

  async function apply() {
    setError('')
    setState('loading')
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to apply')
      setState('applied')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
      setState('idle')
    }
  }

  return (
    <div className="text-right">
      <Button size="sm" loading={state === 'loading'} onClick={apply}>
        Apply
      </Button>
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
