'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, Film, BookOpen, LayoutDashboard, LogOut, Sparkles, Receipt, Settings2, Menu, X, BarChart2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/clients', label: 'Clients', icon: Users },
  { href: '/dashboard/clips', label: 'Clips', icon: Film },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/sources', label: 'Sources', icon: BookOpen },
  { href: '/dashboard/invoices', label: 'Invoices', icon: Receipt },
  { href: '/dashboard/ai-clipper', label: 'AI Clipper', icon: Sparkles, pro: true },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings2 },
]

// Shared nav links + sign out, used by both the desktop sidebar and the mobile drawer
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon, exact, pro }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              {/* Active accent bar */}
              <span
                className={cn(
                  'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-indigo-600 transition-opacity',
                  active ? 'opacity-100' : 'opacity-0'
                )}
                aria-hidden="true"
              />
              <Icon
                size={16}
                className={cn(
                  'shrink-0 transition-colors',
                  active ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
                )}
              />
              {label}
              {pro && (
                <span className="ml-auto rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  PRO
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={signOut}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={16} className="text-gray-400 transition-colors group-hover:text-red-500" />
          Sign out
        </button>
      </div>
    </>
  )
}

// Desktop sidebar — fixed 224px column, always visible on md+
export function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-200">
            <Film size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">ClipFlow</span>
        </div>
      </div>
      <SidebarContent />
    </aside>
  )
}

// MobileNav — mobile-only top bar + slide-in drawer
export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      {/* Mobile top bar — only on small screens */}
      <div className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-100 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-200">
            <Film size={14} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">ClipFlow</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-in drawer */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl flex flex-col transform transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Film size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">ClipFlow</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </div>
    </>
  )
}
