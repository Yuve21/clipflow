import { createClient as createSupabase } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const status = body.status as string | undefined

    if (status !== 'sent' && status !== 'paid') {
      return NextResponse.json({ error: 'status must be "sent" or "paid"' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify membership via invoice → client → workspace
    const { data: invoice } = await admin
      .from('invoices')
      .select('id, clients(workspace_id)')
      .eq('id', id)
      .single()

    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const wsId = (invoice.clients as unknown as { workspace_id: string } | null)?.workspace_id
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', wsId)
      .eq('user_id', user.id)
      .single()

    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const update: { status: string; issued_at?: string; paid_at?: string } = { status }
    if (status === 'sent') update.issued_at = new Date().toISOString()
    if (status === 'paid') update.paid_at = new Date().toISOString()

    const { data, error } = await admin
      .from('invoices')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
