import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Public tracked promo link: logs a click and redirects to the campaign asset.
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const fallback = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin

  try {
    const admin = createAdminClient()
    const { data: dest } = await admin.rpc('record_track_click', {
      p_token: token,
      p_referer: req.headers.get('referer'),
      p_ua: req.headers.get('user-agent'),
    })

    const raw = typeof dest === 'string' && dest.trim() ? dest.trim() : fallback
    const target = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    return NextResponse.redirect(target, 302)
  } catch (err) {
    console.error('Tracking redirect failed', err)
    return NextResponse.redirect(fallback, 302)
  }
}
