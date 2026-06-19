'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DollarSign } from 'lucide-react'
import type { PayoutStatus } from '@/types/database'

export function PayButton({
  participationId,
  defaultCents,
  payoutStatus,
}: {
  participationId: string
  defaultCents: number
  payoutStatus?: PayoutStatus
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (payoutStatus === 'transferred' || payoutStatus === 'paid') {
    return <span className="text-xs font-semibold text-emerald-600">Paid</span>
  }

  async function pay() {
    setError('')
    const amountStr = window.prompt('Amount to pay this clipper (USD):', (defaultCents / 100).toFixed(2))
    if (amountStr == null) return
    const amountCents = Math.round(parseFloat(amountStr) * 100)
    if (!amountCents || amountCents < 50) {
      setError('Enter at least $0.50')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/payouts/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participation_id: participationId, amount_cents: amountCents }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Failed to start payout')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
      setBusy(false)
    }
  }

  return (
    <div className="text-right">
      <Button size="sm" variant="secondary" loading={busy} onClick={pay}>
        <DollarSign size={13} /> Pay
      </Button>
      {payoutStatus === 'failed' && <p className="mt-1 text-[11px] text-amber-600">Last payout failed — retry</p>}
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
