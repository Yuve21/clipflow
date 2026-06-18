import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar, MobileNav } from '@/components/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      {/* Content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top nav */}
        <MobileNav />
        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
