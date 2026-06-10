'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Check, Link as LinkIcon } from 'lucide-react'

interface Props {
  invoiceId: string
  existingLink: string | null
}

export function PaymentLinkButton({ invoiceId, existingLink }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)

  function flashCopied() {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link)
    flashCopied()
  }

  async function generateLink() {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payment-link`, { method: 'POST' })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error || 'Failed to generate link')
      try {
        await navigator.clipboard.writeText(data.url)
        flashCopied()
      } catch {
        // clipboard can fail without focus — the link is still saved
      }
      router.refresh()
    } catch {
      setError(true)
      setTimeout(() => setError(false), 3000)
    } finally {
      setLoading(false)
    }
  }

  if (copied) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
        <Check size={14} />
        Link copied!
      </span>
    )
  }

  if (error) {
    return <span className="text-sm text-red-600">Failed — try again</span>
  }

  if (existingLink) {
    return (
      <Button variant="secondary" size="sm" onClick={() => copyLink(existingLink)}>
        <LinkIcon size={13} />
        Copy link
      </Button>
    )
  }

  return (
    <Button variant="secondary" size="sm" loading={loading} onClick={generateLink}>
      <LinkIcon size={13} />
      Generate link
    </Button>
  )
}
