import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Receipt, DollarSign, Clock, CheckCircle2 } from 'lucide-react'
import { CreateInvoiceButton } from './create-invoice-button'
import { StatusButton } from './status-button'
import { PaymentLinkButton } from './payment-link-button'

type InvoiceStatus = 'draft' | 'sent' | 'paid'

interface InvoiceRow {
  id: string
  client_id: string
  period_start: string
  period_end: string
  total: number
  status: InvoiceStatus
  issued_at: string | null
  paid_at: string | null
  created_at: string
  stripe_payment_link: string | null
  platform_fee_cents: number | null
  paid_via_stripe: boolean
  clients: { name: string; workspace_id: string } | null
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

function formatDate(dateStr: string) {
  // period_start/end are plain `date` columns — parse as local to avoid TZ shifts
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const statusVariant: Record<InvoiceStatus, 'gray' | 'yellow' | 'green'> = {
  draft: 'gray',
  sent: 'yellow',
  paid: 'green',
}

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user!.id)
    .single()

  if (!member) {
    return <div className="p-8 text-gray-500">Setting up your workspace…</div>
  }

  const wsId = member.workspace_id

  const [{ data: invoicesData }, { data: clientsData }, { data: workspaceData }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, client_id, period_start, period_end, total, status, issued_at, paid_at, created_at, stripe_payment_link, platform_fee_cents, paid_via_stripe, clients!inner(name, workspace_id)')
      .eq('clients.workspace_id', wsId)
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, name')
      .eq('workspace_id', wsId)
      .order('name'),
    supabase
      .from('workspaces')
      .select('stripe_onboarded')
      .eq('id', wsId)
      .single(),
  ])

  const invoices = (invoicesData ?? []) as unknown as InvoiceRow[]
  const clients = clientsData ?? []
  const stripeConnected = Boolean(
    (workspaceData as unknown as { stripe_onboarded: boolean } | null)?.stripe_onboarded
  )

  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total), 0)
  const outstanding = invoices
    .filter(inv => inv.status === 'sent')
    .reduce((sum, inv) => sum + Number(inv.total), 0)

  const now = new Date()
  const paidThisMonth = invoices
    .filter(inv => {
      if (inv.status !== 'paid' || !inv.paid_at) return false
      const paid = new Date(inv.paid_at)
      return paid.getFullYear() === now.getFullYear() && paid.getMonth() === now.getMonth()
    })
    .reduce((sum, inv) => sum + Number(inv.total), 0)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 text-sm mt-1">Bill your clients and track what&apos;s outstanding.</p>
        </div>
        <CreateInvoiceButton clients={clients} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg"><DollarSign size={18} className="text-indigo-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{currency.format(totalInvoiced)}</p>
              <p className="text-xs text-gray-500">Total invoiced</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg"><Clock size={18} className="text-yellow-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{currency.format(outstanding)}</p>
              <p className="text-xs text-gray-500">Outstanding</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><CheckCircle2 size={18} className="text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{currency.format(paidThisMonth)}</p>
              <p className="text-xs text-gray-500">Paid this month</p>
            </div>
          </div>
        </Card>
      </div>

      <Card padding={false}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">All invoices</h2>
        </div>
        {!invoices.length ? (
          <div className="p-12 text-center">
            <Receipt size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">No invoices yet. Create your first one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Period</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Net</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => (
                <tr key={invoice.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-900">{invoice.clients?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
                  </td>
                  <td className="px-5 py-3 text-gray-900">{currency.format(Number(invoice.total))}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {invoice.platform_fee_cents != null
                      ? currency.format(Number(invoice.total) - invoice.platform_fee_cents / 100)
                      : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={statusVariant[invoice.status]}>{invoice.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      {invoice.status === 'sent' && stripeConnected && (
                        <PaymentLinkButton
                          invoiceId={invoice.id}
                          existingLink={invoice.stripe_payment_link}
                        />
                      )}
                      <StatusButton invoiceId={invoice.id} status={invoice.status} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
