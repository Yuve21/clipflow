'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Rocket, Loader2, Star } from 'lucide-react'

interface Clipper {
  workspace_id: string
  display_name: string
  bio: string | null
  total_followers: number
  clicks: number
  overlap: number
  niches: string[]
}

export function CampaignActions({ campaignId, boostedUntil }: { campaignId: string; boostedUntil: string | null }) {
  const router = useRouter()
  const isBoosted = !!boostedUntil && new Date(boostedUntil).getTime() > Date.now()

  const [matchOpen, setMatchOpen] = useState(false)
  const [matching, setMatching] = useState(false)
  const [clippers, setClippers] = useState<Clipper[] | null>(null)
  const [boosting, setBoosting] = useState(false)
  const [error, setError] = useState('')

  async function findClippers() {
    setMatchOpen(true)
    if (clippers) return
    setMatching(true)
    setError('')
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/match`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Match failed')
      setClippers(data.clippers ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setMatching(false)
    }
  }

  async function boost() {
    setError('')
    setBoosting(true)
    try {
      const res = await fetch('/api/boost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'campaign', id: campaignId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Boost failed')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBoosting(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" onClick={findClippers}>
        <Sparkles size={14} /> Find clippers · 1 credit
      </Button>
      {isBoosted ? (
        <Badge variant="indigo"><Star size={11} className="mr-1" /> Featured</Badge>
      ) : (
        <Button variant="secondary" size="sm" loading={boosting} onClick={boost}>
          <Rocket size={14} /> Boost · 5 credits
        </Button>
      )}
      {error && <span className="text-[11px] text-red-600">{error}</span>}

      <Modal open={matchOpen} onClose={() => setMatchOpen(false)} title="Best-matched clippers" className="max-w-lg">
        {matching ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" /> Matching clippers to your campaign…
          </div>
        ) : error ? (
          <p className="py-6 text-sm text-red-600">{error}</p>
        ) : !clippers?.length ? (
          <p className="py-6 text-center text-sm text-gray-500">No listed clippers match yet. Check back as more clippers join.</p>
        ) : (
          <div className="space-y-3">
            {clippers.map((c) => (
              <div key={c.workspace_id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-gray-900">{c.display_name}</p>
                  {c.overlap > 0 && <Badge variant="green">{c.overlap} niche match{c.overlap === 1 ? '' : 'es'}</Badge>}
                </div>
                {c.bio && <p className="mt-1 text-xs text-gray-600 line-clamp-2">{c.bio}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.niches.map((n) => <Badge key={n} variant="gray">{n}</Badge>)}
                </div>
                <p className="mt-2 text-[11px] text-gray-400">
                  {c.total_followers.toLocaleString('en-US')} followers · {c.clicks} tracked clicks
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
