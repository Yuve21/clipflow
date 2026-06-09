import { cn } from '@/lib/utils'

interface CardProps {
  className?: string
  children: React.ReactNode
  padding?: boolean
}

export function Card({ className, children, padding = true }: CardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-100 shadow-sm', padding && 'p-5', className)}>
      {children}
    </div>
  )
}
