'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PortalLinkButton({ portalToken }: { portalToken: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}/portal/${portalToken}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="secondary" size="sm" onClick={copy}>
      {copied ? (
        <>
          <Check size={14} className="text-green-600" /> Copied!
        </>
      ) : (
        <>
          <Share2 size={14} /> Copy portal link
        </>
      )}
    </Button>
  )
}
