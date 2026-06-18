'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Coins, Check, Loader2 } from 'lucide-react'
import { CREDIT_PACKS, perCreditCents } from '@/lib/credits'

interface Props {
  variant?: 'primary' | 'secondary'
  label?: string
}

export function BuyCreditsButton({ variant = 'secondary', label = 'Buy credits' }: Props) {
  const [open, setOpen] = useState(false)
  const [loadingPack, setLoadingPack] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function buy(packId: string) {
    setError('')
    setLoadingPack(packId)
    try {
      const res = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: packId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout failed')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoadingPack(null)
    }
  }

  return (
    <>
      <Button variant={variant} size="sm" onClick={() => setOpen(true)}>
        <Coins size={16} /> {label}
      </Button>

      <Modal open={open} onClose={() => !loadingPack && setOpen(false)} title="Buy AI Clipper credits" className="max-w-lg">
        <p className="text-sm text-gray-500 mb-5">
          1 credit = 1 AI clip job (source video up to 90 min). Credits never expire.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {CREDIT_PACKS.map((pack) => {
            const each = perCreditCents(pack)
            const isLoading = loadingPack === pack.id
            return (
              <button
                key={pack.id}
                type="button"
                disabled={!!loadingPack}
                onClick={() => buy(pack.id)}
                className="group relative flex flex-col items-start rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50/40 disabled:opacity-60"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{pack.label}</span>
                <span className="mt-1 text-2xl font-bold text-gray-900">{pack.credits} credits</span>
                <span className="mt-1 text-sm text-gray-600">${(pack.priceCents / 100).toFixed(0)}</span>
                <span className="mt-0.5 text-xs text-gray-400">${(each / 100).toFixed(2)} / credit</span>
                {isLoading && (
                  <Loader2 size={16} className="absolute right-3 top-3 animate-spin text-indigo-500" />
                )}
                {!isLoading && (
                  <Check size={16} className="absolute right-3 top-3 text-indigo-500 opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </button>
            )
          })}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <p className="mt-4 text-xs text-gray-400">Secure checkout via Stripe. You&apos;ll be redirected to pay.</p>
      </Modal>
    </>
  )
}
