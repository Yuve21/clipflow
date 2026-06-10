'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Plus, X } from 'lucide-react'

interface Client {
  id: string
  name: string
}

interface Props {
  clients: Client[]
}

interface LineItemDraft {
  description: string
  quantity: string
  unit_price: string
}

const emptyItem: LineItemDraft = { description: '', quantity: '1', unit_price: '' }

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

function itemAmount(item: LineItemDraft) {
  const qty = parseFloat(item.quantity) || 0
  const price = parseFloat(item.unit_price) || 0
  return Math.round(qty * price * 100) / 100
}

export function CreateInvoiceButton({ clients }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [clientId, setClientId] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [items, setItems] = useState<LineItemDraft[]>([{ ...emptyItem }])

  const total = items.reduce((sum, item) => sum + itemAmount(item), 0)

  function updateItem(i: number, field: keyof LineItemDraft, value: string) {
    setItems(prev => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)))
  }

  function addItem() {
    setItems(prev => [...prev, { ...emptyItem }])
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  function resetForm() {
    setClientId('')
    setPeriodStart('')
    setPeriodEnd('')
    setItems([{ ...emptyItem }])
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const validItems = items.filter(item => item.description.trim())
    if (!clientId) return setError('Pick a client')
    if (!periodStart || !periodEnd) return setError('Set the billing period')
    if (periodEnd < periodStart) return setError('Period end must be after period start')
    if (!validItems.length) return setError('Add at least one line item with a description')

    setLoading(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          period_start: periodStart,
          period_end: periodEnd,
          line_items: validItems.map(item => ({
            description: item.description.trim(),
            quantity: parseFloat(item.quantity) || 0,
            unit_price: parseFloat(item.unit_price) || 0,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create invoice')
      }

      setOpen(false)
      resetForm()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} />
        Create invoice
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create invoice" className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select label="Client" value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">Select a client…</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Period start"
              type="date"
              value={periodStart}
              onChange={e => setPeriodStart(e.target.value)}
            />
            <Input
              label="Period end"
              type="date"
              value={periodEnd}
              onChange={e => setPeriodEnd(e.target.value)}
            />
          </div>

          <div>
            <div className="grid grid-cols-12 gap-2 mb-1 text-xs font-medium text-gray-500">
              <span className="col-span-5">Description</span>
              <span className="col-span-2">Qty</span>
              <span className="col-span-2">Unit price ($)</span>
              <span className="col-span-2">Amount</span>
              <span className="col-span-1" />
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Input
                      value={item.description}
                      onChange={e => updateItem(i, 'description', e.target.value)}
                      placeholder="e.g. 12 clips, June batch"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={e => updateItem(i, 'unit_price', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2 text-sm text-gray-700 text-right tabular-nums">
                    {currency.format(itemAmount(item))}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      disabled={items.length === 1}
                      className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Remove line item"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={addItem}>
                <Plus size={14} />
                Add line item
              </Button>
              <p className="text-sm text-gray-900">
                <span className="text-gray-500 mr-2">Total</span>
                <span className="font-semibold tabular-nums">{currency.format(total)}</span>
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create invoice
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
