'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface Props {
  invoiceId: string
  status: 'draft' | 'sent' | 'paid'
}

export function StatusButton({ invoiceId, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function updateStatus(next: 'sent' | 'paid') {
    setLoading(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
        <Check size={14} />
        Paid
      </span>
    )
  }

  if (status === 'draft') {
    return (
      <Button variant="secondary" size="sm" loading={loading} onClick={() => updateStatus('sent')}>
        Mark as sent
      </Button>
    )
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      loading={loading}
      onClick={() => updateStatus('paid')}
      className="text-green-700 border-green-200 hover:bg-green-50 active:bg-green-100"
    >
      Mark as paid
    </Button>
  )
}
