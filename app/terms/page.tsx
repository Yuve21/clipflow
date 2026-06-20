import type { Metadata } from 'next'
import Link from 'next/link'
import { Film, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service — ClipFlow',
  description: 'The terms that govern your use of ClipFlow.',
}

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: June 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-base font-semibold text-gray-900">1. Acceptance</h2>
            <p className="mt-2">
              By creating an account or using ClipFlow (the &ldquo;Service&rdquo;), you agree to these Terms.
              If you don&apos;t agree, don&apos;t use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">2. The Service</h2>
            <p className="mt-2">
              ClipFlow provides tools for short-form content operators (&ldquo;clippers&rdquo;) and brands,
              including client and clip management, an AI Clipper for finding viral moments, invoicing,
              and a promotion marketplace connecting brands and clippers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">3. Accounts</h2>
            <p className="mt-2">
              You&apos;re responsible for activity under your account and for keeping access credentials
              secure. You must provide accurate information and be able to form a binding contract.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">4. AI Clipper credits</h2>
            <p className="mt-2">
              The AI Clipper is pay-per-use. One credit is consumed per clip-generation job (source video
              up to 90 minutes). Credits are non-refundable once a job has begun processing, except that we
              automatically refund a credit if a job fails before any processing occurs (for example, a video
              exceeding the length limit). Credits do not expire. Prices may change prospectively.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">5. Marketplace</h2>
            <p className="mt-2">
              The marketplace lets brands fund campaigns and clippers promote them. ClipFlow is a platform and
              is not a party to any agreement between a brand and a clipper. We charge a platform fee on
              marketplace payouts (currently 15% of the amount a brand pays a clipper). Payouts are made to a
              clipper&apos;s connected Stripe account; clippers must complete Stripe onboarding to receive funds.
              Participants are solely responsible for the legality of their promotions, including any required
              disclosures (e.g., #ad / sponsorship disclosures) and platform rules.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">6. Content &amp; intellectual property</h2>
            <p className="mt-2">
              You retain ownership of the content you upload. You grant ClipFlow a limited license to store,
              process, and transmit that content solely to provide the Service (including sending audio/video
              to our AI providers for analysis). You represent that you have the rights to the content you
              upload and promote.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">7. Acceptable use</h2>
            <p className="mt-2">
              Don&apos;t use the Service for unlawful, infringing, deceptive, or abusive purposes; don&apos;t
              attempt to bypass billing, security, or usage limits; and don&apos;t upload content you don&apos;t
              have the rights to. We may suspend accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">8. Payments</h2>
            <p className="mt-2">
              Payments are processed by Stripe and subject to Stripe&apos;s terms. We don&apos;t store full
              card details. Taxes are your responsibility unless stated otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">9. Disclaimers &amp; liability</h2>
            <p className="mt-2">
              The Service is provided &ldquo;as is&rdquo; without warranties. AI outputs may be inaccurate and
              should be reviewed before use. To the maximum extent permitted by law, ClipFlow is not liable for
              indirect or consequential damages, and our total liability is limited to the amounts you paid us
              in the prior three months.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">10. Changes &amp; contact</h2>
            <p className="mt-2">
              We may update these Terms; material changes will be reflected by the date above. Questions?
              Contact <a href="mailto:support@clipflow.app" className="text-indigo-600 hover:underline">support@clipflow.app</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
