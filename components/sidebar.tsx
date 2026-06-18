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
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon size={16} />
              {label}
              {pro && (
                <span className="bg-indigo-100 text-indigo-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
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
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut size={16} />
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
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
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
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
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
