'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function TrackingLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex gap-2">
      <div className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">
        {url}
      </div>
      <button
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        {copied ? <><Check size={13} className="text-green-600" /> Copied</> : <><Copy size={13} /> Copy</>}
      </button>
    </div>
  )
}
