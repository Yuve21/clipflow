'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ExternalLink } from 'lucide-react'

type Status = 'loading' | 'disconnected' | 'connected'

export function StripeConnectButton() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stripeParam = searchParams.get('stripe')

  const [status, setStatus] = useState<Status>('loading')
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const handledParam = useRef(false)

  const startOnboarding = useCallback(async () => {
    setRedirecting(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' })
      const data = (await res.json()) as { url?: string; alreadyConnected?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error || 'Failed to start Stripe onboarding')
      if (data.alreadyConnected) {
        setStatus('connected')
        setRedirecting(false)
        return
      }
      if (data.url) {
        window.location.href = data.url
        return // keep spinner while navigating away
      }
      throw new Error('No onboarding URL returned')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setRedirecting(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/stripe/connect/status')
        if (!res.ok) throw new Error('Failed to load Stripe status')
        const data = (await res.json()) as { connected: boolean }
        if (cancelled) return

        setStatus(data.connected ? 'connected' : 'disconnected')

        if (!handledParam.current && stripeParam) {
          handledParam.current = true
          if (stripeParam === 'success') {
            setShowSuccess(true)
            // clean the query param so refreshes don't re-toast
            router.replace('/dashboard/settings', { scroll: false })
          } else if (stripeParam === 'refresh' && !data.connected) {
            router.replace('/dashboard/settings', { scroll: false })
            void startOnboarding()
          }
        }
      } catch {
        if (!cancelled) {
          setStatus('disconnected')
          setError('Could not load Stripe status')
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [stripeParam, router, startOnboarding])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
        <div className="h-9 w-36 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {showSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
          <CheckCircle2 size={15} />
          Stripe connected successfully!
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {status === 'connected' ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
            <CheckCircle2 size={15} />
            Stripe connected
          </span>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <Button variant="secondary" size="sm">
              View dashboard
              <ExternalLink size={13} />
            </Button>
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
            <span className="w-2 h-2 rounded-full bg-gray-300" />
            Not connected
          </span>
          <Button size="sm" className="shrink-0" loading={redirecting} onClick={startOnboarding}>
            Connect Stripe →
          </Button>
        </div>
      )}
    </div>
  )
}
