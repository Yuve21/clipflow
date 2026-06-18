import { createClient as createSupabase } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request) {
  try {
    const supabase = await createSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => null)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
    }
    if (name.length > 80) {
      return NextResponse.json({ error: 'Workspace name must be 80 characters or fewer' }, { status: 400 })
    }

    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = createAdminClient()

    // Verify the user owns this workspace
    const { data: workspace } = await admin
      .from('workspaces')
      .select('id, owner_user_id')
      .eq('id', member.workspace_id)
      .single()

    if (!workspace || workspace.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: updated, error } = await admin
      .from('workspaces')
      .update({ name })
      .eq('id', workspace.id)
      .select()
      .single()

    if (error || !updated) {
      return NextResponse.json({ error: error?.message || 'Failed to update workspace' }, { status: 500 })
    }

    return NextResponse.json({ workspace: updated })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
