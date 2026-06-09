'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2 } from 'lucide-react'

interface Props {
  token: string
  agreementId: string
}

export function AcceptAgreementForm({ token, agreementId }: Props) {
  const [name, setName] = useState('')
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()
    if (!checked || !name.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/agreements/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to accept')
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
        <h2 className="font-bold text-gray-900 text-lg">You&apos;re all set!</h2>
        <p className="text-sm text-gray-500 mt-1">Your clipper can now start posting clips on your behalf. You can close this page.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleAccept} className="space-y-4">
      <Input
        label="Your full name"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Enter your full name to confirm"
        required
      />
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm text-gray-700 leading-relaxed">
          I have read and agree to the terms above. I authorize clips from my content to be posted by the listed accounts.
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        type="submit"
        className="w-full"
        loading={loading}
        disabled={!checked || !name.trim()}
      >
        Accept & authorize
      </Button>
    </form>
  )
}
