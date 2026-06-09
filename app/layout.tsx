import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ClipFlow — OS for Freelance Clippers',
  description: 'Manage clients, prove delivery, and get paid.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
