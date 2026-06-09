import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { name } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: agreement } = await admin
    .from('client_agreements')
    .select('id, accepted, client_id')
    .eq('token', token)
    .single()

  if (!agreement) {
    return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
  }

  if (agreement.accepted) {
    return NextResponse.json({ error: 'Already accepted' }, { status: 409 })
  }

  // Mark agreement accepted
  await admin.from('client_agreements').update({
    accepted: true,
    accepted_by_name: name.trim(),
    accepted_at: new Date().toISOString(),
  }).eq('id', agreement.id)

  // Flip client to active
  await admin.from('clients').update({ status: 'active' }).eq('id', agreement.client_id)

  return NextResponse.json({ ok: true })
}
