'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import type { ParticipationStatus } from '@/types/database'

export function ParticipantDecision({
  participationId,
  initialStatus,
}: {
  participationId: string
  initialStatus: ParticipationStatus
}) {
  const [status, setStatus] = useState<ParticipationStatus>(initialStatus)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function decide(next: 'approved' | 'rejected') {
    setError('')
    setBusy(true)
    try {
      const res = await fetch(`/api/participations/${participationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setStatus(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'approved' || status === 'active' || status === 'completed') {
    return <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-600"><Check size={13} /> Approved</span>
  }
  if (status === 'rejected') {
    return <span className="shrink-0 text-xs font-medium text-gray-400">Declined</span>
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {error && <span className="text-[11px] text-red-600">{error}</span>}
      <button
        onClick={() => decide('rejected')}
        disabled={busy}
        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50"
        aria-label="Decline"
        title="Decline"
      >
        <X size={15} />
      </button>
      <button
        onClick={() => decide('approved')}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        <Check size={13} /> Approve
      </button>
    </div>
  )
}
