import type { Metadata } from 'next'
import Link from 'next/link'
import { Film, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy — ClipFlow',
  description: 'How ClipFlow collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600">
              <Film className="h-4 w-4 text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight">ClipFlow</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: June 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-base font-semibold text-gray-900">What we collect</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><span className="font-medium text-gray-900">Account data</span> — your email and workspace details.</li>
              <li><span className="font-medium text-gray-900">Content you upload</span> — videos and source material you submit to the AI Clipper.</li>
              <li><span className="font-medium text-gray-900">Operational data</span> — clients, clips, posts, campaigns, applications, and tracked clicks/conversions.</li>
              <li><span className="font-medium text-gray-900">Payment metadata</span> — handled by Stripe; we store identifiers and status, not full card numbers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">How we use it</h2>
            <p className="mt-2">
              To provide and operate the Service: run AI analysis on uploaded content, power the marketplace and
              payouts, generate invoices, track promotion performance, and improve reliability. We don&apos;t sell
              your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Service providers</h2>
            <p className="mt-2">We share data with subprocessors only as needed to run the Service:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><span className="font-medium text-gray-900">Supabase</span> — database, authentication, and file storage.</li>
              <li><span className="font-medium text-gray-900">OpenAI</span> — transcription and analysis of content you submit to the AI Clipper.</li>
              <li><span className="font-medium text-gray-900">Stripe</span> — payments, connected-account payouts, and the marketplace fee.</li>
              <li><span className="font-medium text-gray-900">Vercel</span> — application hosting.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Storage &amp; security</h2>
            <p className="mt-2">
              Data is stored in Supabase with row-level security isolating each workspace. Uploaded videos are
              stored in private buckets scoped to your workspace. No method of transmission or storage is 100%
              secure, but we take reasonable measures to protect your data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Retention</h2>
            <p className="mt-2">
              We keep your data while your account is active. Uploaded source videos are processed and may be
              removed after a job completes; generated clips and operational records are retained until you delete
              them or close your account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Cookies</h2>
            <p className="mt-2">
              We use essential cookies to keep you signed in. We don&apos;t use third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">Your rights &amp; contact</h2>
            <p className="mt-2">
              You can request access to or deletion of your data by contacting
              {' '}<a href="mailto:support@clipflow.app" className="text-indigo-600 hover:underline">support@clipflow.app</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
