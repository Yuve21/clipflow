'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Gift, Copy, Check, Users, Coins } from 'lucide-react'

interface Data { code: string; signups: number; creditsEarned: number }

export default function ReferralsPage() {
  const [data, setData] = useState<Data | null>(null)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
    fetch('/api/referrals').then((r) => r.json()).then((d) => { if (d.code) setData(d) }).catch(() => {})
  }, [])

  const link = data ? `${origin}/login?ref=${data.code}` : ''

  async function copy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Refer &amp; earn</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Invite other clippers. When they sign up with your link, you both get rolling — you earn
          <span className="font-medium text-gray-900"> 3 AI credits</span> per signup.
        </p>
      </div>

      <Card className="mb-6">
        <label className="text-sm font-medium text-gray-700">Your referral link</label>
        <div className="mt-2 flex gap-2">
          <div className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-600">
            {link || 'Loading…'}
          </div>
          <Button variant="secondary" onClick={copy} disabled={!link}>
            {copied ? <><Check size={15} className="text-green-600" /> Copied</> : <><Copy size={15} /> Copy</>}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2"><Users size={18} className="text-indigo-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data?.signups ?? 0}</p>
              <p className="text-xs text-gray-500">Clippers referred</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2"><Coins size={18} className="text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data?.creditsEarned ?? 0}</p>
              <p className="text-xs text-gray-500">AI credits earned</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900"><Gift size={16} className="text-indigo-600" /> How it works</h2>
        <ol className="mt-3 space-y-2 text-sm text-gray-600">
          <li>1. Share your link with another clipper.</li>
          <li>2. They sign up through it.</li>
          <li>3. You instantly get 3 AI Clipper credits. No limit on referrals.</li>
        </ol>
      </Card>
    </div>
  )
}
