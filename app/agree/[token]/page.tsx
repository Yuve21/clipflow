import { createAdminClient } from '@/lib/supabase/admin'
import { AcceptAgreementForm } from './accept-form'
import { CheckCircle2 } from 'lucide-react'

export default async function AgreePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: agreement } = await admin
    .from('client_agreements')
    .select(`*, clients(name, posting_accounts(platform, handle, follower_count))`)
    .eq('token', token)
    .single()

  if (!agreement) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">🔗</div>
          <h1 className="font-bold text-gray-900 text-lg mb-2">Link not found</h1>
          <p className="text-sm text-gray-500">This agreement link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  if (agreement.accepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full text-center">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
          <h1 className="font-bold text-gray-900 text-lg mb-2">Agreement already accepted</h1>
          <p className="text-sm text-gray-500">
            This was accepted on {new Date(agreement.accepted_at!).toLocaleDateString('en-US', { dateStyle: 'long' })}.
          </p>
        </div>
      </div>
    )
  }

  const client = agreement.clients as { name: string; posting_accounts: { platform: string; handle: string; follower_count: number }[] }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="2">
              <path d="M15 10l4.553-2.069A1 1 0 0121 8.87V18a1 1 0 01-1.447.894L15 16.5M4 8h11v9H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Content Posting Authorization</h1>
          <p className="text-sm text-gray-500 mt-1">For <strong>{client.name}</strong></p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Agreement Terms</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{agreement.term_text}</p>
        </div>

        {client.posting_accounts?.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Posting accounts</h2>
            <div className="space-y-2">
              {client.posting_accounts.map((pa, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-white border border-gray-100 rounded-lg px-3 py-2">
                  <span className="font-medium text-gray-900">@{pa.handle}</span>
                  <div className="flex items-center gap-2 text-gray-500">
                    <span>{pa.platform}</span>
                    <span>·</span>
                    <span>{formatFollowers(pa.follower_count)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <AcceptAgreementForm token={token} agreementId={agreement.id} />

        <p className="text-xs text-gray-400 text-center mt-4">
          Powered by ClipFlow · This is a lightweight authorization checkbox, not a legally binding e-signature.
        </p>
      </div>
    </div>
  )
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}
