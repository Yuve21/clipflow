import Link from 'next/link'
import {
  Film,
  CheckCircle2,
  Zap,
  Users,
  FileText,
  Sparkles,
  BarChart2,
  ArrowRight,
  Star,
  Megaphone,
} from 'lucide-react'

const PROBLEMS = [
  {
    before: 'Approval requests buried in Discord threads',
    after: 'One agreement signed up front. Post the moment a clip is ready.',
    title: 'No more approval limbo',
  },
  {
    before: 'Client trackers scattered across Notion docs nobody updates',
    after: 'Every client, clip, and account lives in one pipeline you actually use.',
    title: 'One source of truth',
  },
  {
    before: 'Invoices built by hand at the end of the month, from memory',
    after: 'Posting log feeds your invoice. Every clip is a line item, automatically.',
    title: 'Get paid for everything',
  },
] as const

const FEATURES = [
  {
    icon: FileText,
    title: 'One-Time Agreement',
    description:
      'Client signs once via a tokenized link. You post forever. No chasing for approval on every clip.',
  },
  {
    icon: Film,
    title: 'Clip Kanban',
    description:
      'todo → editing → ready → posted → flagged. Every clip has a home, and nothing falls through the cracks.',
  },
  {
    icon: Users,
    title: 'Client Portal',
    description:
      'Clients get a clean, live view of their content pipeline — no login, no back-and-forth.',
  },
  {
    icon: BarChart2,
    title: 'Posting Log',
    description:
      'Every post tracked: platform, account, timestamp, views. Proof of work, on the record.',
  },
  {
    icon: Sparkles,
    title: 'AI Clipper',
    description:
      'Upload long content. Get back ranked viral moments with transcript, visual, and audio scores. Pay per use — buy credits as you go.',
  },
  {
    icon: Megaphone,
    title: 'Promotion Marketplace',
    description:
      'Get paid to promote brands, products, and music — or post a campaign and let clippers amplify yours. Tracked links, approvals, payouts.',
  },
  {
    icon: Zap,
    title: 'Invoicing & Payouts',
    description:
      'Invoice clients through Stripe, get paid directly, and receive marketplace payouts to your connected account.',
  },
] as const

const FREE_FEATURES = [
  'Unlimited clients & clips',
  'Clip kanban + posting log',
  'Client agreements & portals',
  'Invoicing with Stripe payouts',
  'Promotion marketplace access',
] as const

const PRO_FEATURES = [
  '1 credit = 1 AI clip job',
  'Transcript + visual + audio scoring',
  'Source videos up to 90 min',
  'Credits never expire',
] as const

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ───────────────────────── Navbar ───────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Film className="h-4.5 w-4.5 text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight">ClipFlow</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-gray-600 sm:flex">
            <a href="#features" className="transition-colors hover:text-gray-900">
              Features
            </a>
            <a href="#pricing" className="transition-colors hover:text-gray-900">
              Pricing
            </a>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      <main>
        {/* ───────────────────────── Hero ───────────────────────── */}
        <section className="bg-gradient-to-b from-white to-indigo-50">
          <div className="mx-auto max-w-6xl px-4 pb-24 pt-20 text-center sm:px-6 sm:pt-28">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-600 shadow-sm">
              <Star className="h-3.5 w-3.5 fill-indigo-600" />
              The operating system for freelance clippers
            </p>
            <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
              Stop chasing approvals.{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Start posting.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              ClipFlow replaces the Notion docs, Discord threads, and manual invoices.
              Your client signs once — then you manage the pipeline, post autonomously,
              and let AI surface the viral moments for you.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 sm:w-auto"
              >
                Start free — no card needed
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex w-full items-center justify-center rounded-lg px-6 py-3 text-base font-semibold text-gray-700 transition-colors hover:bg-white hover:text-gray-900 sm:w-auto"
              >
                See how it works
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              {[
                'No per-clip approvals',
                'One agreement, forever',
                'AI-powered viral scoring',
              ].map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────────────────── Problem ──────────────────────── */}
        <section className="border-t border-gray-100 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Clipping is the easy part. The admin is killing you.
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                You didn&apos;t become a clipper to babysit spreadsheets and wait on
                &ldquo;looks good, post it&rdquo; messages.
              </p>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {PROBLEMS.map((problem) => (
                <div
                  key={problem.title}
                  className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-base font-semibold">{problem.title}</h3>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg border border-red-100 bg-red-50/60 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                        Before
                      </p>
                      <p className="mt-1 text-sm text-gray-700">{problem.before}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                        With ClipFlow
                      </p>
                      <p className="mt-1 text-sm text-gray-700">{problem.after}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────────────────── Features ──────────────────────── */}
        <section id="features" className="scroll-mt-16 border-t border-gray-100 bg-gray-50/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything between &ldquo;raw footage&rdquo; and &ldquo;paid invoice&rdquo;
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Not a marketplace. Not an editor. The operations layer your clipping
                business runs on.
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                    <feature.icon className="h-5 w-5 text-white" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────────────── AI Clipper callout ──────────────────── */}
        <section className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-200">
                <Sparkles className="h-3.5 w-3.5" />
                Pro feature
              </p>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Find viral moments before you even watch the footage.
              </h2>
              <p className="mt-4 text-lg text-indigo-200/90">
                Drop in a podcast, stream VOD, or interview. The AI Clipper scores every
                moment three ways and hands you a ranked shortlist.
              </p>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {[
                {
                  emoji: '📝',
                  title: 'Transcript Analysis',
                  description:
                    'GPT-4o scores hook quality, emotional language, and quotability across the full transcript.',
                },
                {
                  emoji: '👁',
                  title: 'Visual Analysis',
                  description:
                    'GPT-4o Vision scores eye contact, expressions, and body language frame by frame.',
                },
                {
                  emoji: '🔊',
                  title: 'Audio Energy',
                  description:
                    'FFmpeg detects vocal excitement peaks — perfect for podcasts and live streams.',
                },
              ].map((pillar) => (
                <div
                  key={pillar.title}
                  className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
                >
                  <span className="text-2xl" aria-hidden="true">
                    {pillar.emoji}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-white">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-indigo-200/80">
                    {pillar.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-14 flex flex-col items-center gap-8">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
                  Composite viral score
                </p>
                <p className="mt-2 text-7xl font-extrabold text-white [text-shadow:0_0_40px_rgba(129,140,248,0.8)]">
                  94
                </p>
              </div>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50"
              >
                See credit pricing
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        {/* ──────────────────────── Pricing ──────────────────────── */}
        <section id="pricing" className="scroll-mt-16 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Simple pricing. Free until AI does your scouting.
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                The whole platform — including the promotion marketplace — is free. Pay only when you
                want the AI Clipper finding moments for you.
              </p>
            </div>
            <div className="mx-auto mt-14 grid max-w-3xl gap-6 md:grid-cols-2">
              {/* Free plan */}
              <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
                <h3 className="text-base font-semibold">Free</h3>
                <p className="mt-3">
                  <span className="text-4xl font-extrabold tracking-tight">$0</span>
                  <span className="text-sm font-medium text-gray-500">/month</span>
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {FREE_FEATURES.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
                >
                  Start free
                </Link>
              </div>
              {/* AI Clipper credits — pay per use */}
              <div className="relative flex flex-col rounded-xl border-2 border-indigo-600 bg-white p-8 shadow-md">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold tracking-wide text-white">
                  PAY AS YOU GO
                </span>
                <h3 className="text-base font-semibold">AI Clipper credits</h3>
                <p className="mt-3">
                  <span className="text-sm font-medium text-gray-500">from </span>
                  <span className="text-4xl font-extrabold tracking-tight">$1.20</span>
                  <span className="text-sm font-medium text-gray-500">/credit</span>
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {PRO_FEATURES.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  Start free — 2 credits included
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ──────────────────────── Footer ──────────────────────── */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-gray-500 sm:flex-row sm:px-6">
          <p>© 2026 ClipFlow. Built for clippers, by clippers.</p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="transition-colors hover:text-gray-900">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-gray-900">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
