'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState('')

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setGoogleError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setGoogleError(error.message)
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="2">
              <path d="M15 10l4.553-2.069A1 1 0 0121 8.87V18a1 1 0 01-1.447.894L15 16.5M4 8h11v9H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">ClipFlow</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in with magic link</p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-3">📬</div>
            <p className="font-medium text-gray-900">Check your inbox</p>
            <p className="text-sm text-gray-500 mt-1">We sent a magic link to <strong>{email}</strong></p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              Send magic link
            </Button>
          </form>
        )}

        <div className="mt-6 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.766 12.276c0-.815-.073-1.6-.21-2.353H12.24v4.448h6.482a5.54 5.54 0 01-2.404 3.636v3.022h3.89c2.277-2.097 3.558-5.184 3.558-8.753z"
              />
              <path
                fill="#34A853"
                d="M12.24 24c3.24 0 5.956-1.075 7.942-2.907l-3.89-3.022c-1.077.722-2.456 1.149-4.052 1.149-3.117 0-5.755-2.105-6.697-4.934H1.52v3.12A11.996 11.996 0 0012.24 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.543 14.286a7.213 7.213 0 010-4.572v-3.12H1.52a11.996 11.996 0 000 10.812l4.023-3.12z"
              />
              <path
                fill="#EA4335"
                d="M12.24 4.78c1.762 0 3.344.605 4.587 1.794l3.442-3.442C18.19 1.19 15.477 0 12.24 0A11.996 11.996 0 001.52 6.594l4.023 3.12c.942-2.83 3.58-4.934 6.697-4.934z"
              />
            </svg>
            Continue with Google
          </button>
          {googleError && <p className="text-sm text-red-600">{googleError}</p>}
        </div>
      </div>
    </div>
  )
}
