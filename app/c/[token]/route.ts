import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// 1x1 transparent GIF conversion pixel. A brand drops
// <img src="https://<site>/c/<token>?value=49.99"> on their thank-you page;
// we attribute a conversion (optional dollar value) to the clipper's participation.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64')

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const valueParam = new URL(req.url).searchParams.get('value')
  const valueCents = valueParam && !Number.isNaN(parseFloat(valueParam))
    ? Math.round(parseFloat(valueParam) * 100)
    : null

  try {
    const admin = createAdminClient()
    await admin.rpc('record_conversion', { p_token: token, p_value_cents: valueCents })
  } catch (err) {
    console.error('Conversion record failed', err)
  }

  return new Response(PIXEL, {
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, max-age=0' },
  })
}
