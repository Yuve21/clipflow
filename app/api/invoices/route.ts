import { createClient as createSupabase } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

interface LineItemInput {
  description: string
  quantity: number
  unit_price: number
}

export async function GET() {
  const supabase = await createSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('invoices')
    .select('*, clients!inner(name, workspace_id)')
    .eq('clients.workspace_id', member.workspace_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const invoices = (data ?? []).map(({ clients, ...invoice }) => ({
    ...invoice,
    client_name: (clients as unknown as { name: string }).name,
  }))

  return NextResponse.json(invoices)
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { client_id, period_start, period_end } = body as {
      client_id?: string
      period_start?: string
      period_end?: string
    }
    const lineItems = body.line_items as LineItemInput[] | undefined

    if (!client_id || !period_start || !period_end) {
      return NextResponse.json({ error: 'client_id, period_start and period_end are required' }, { status: 400 })
    }
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify the client belongs to a workspace the user is a member of
    const { data: client } = await admin
      .from('clients')
      .select('id, workspace_id')
      .eq('id', client_id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', client.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const computedItems = lineItems.map(item => {
      const quantity = Number(item.quantity) || 0
      const unit_price = Number(item.unit_price) || 0
      return {
        description: String(item.description ?? '').trim(),
        quantity,
        unit_price,
        amount: Math.round(quantity * unit_price * 100) / 100,
      }
    })

    if (computedItems.some(item => !item.description)) {
      return NextResponse.json({ error: 'Every line item needs a description' }, { status: 400 })
    }

    const total = Math.round(computedItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100

    const { data: invoice, error } = await admin
      .from('invoices')
      .insert({
        client_id,
        period_start,
        period_end,
        line_items: computedItems,
        total,
        status: 'draft',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(invoice, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
