import type { PayoutModel, PromoType } from '@/types/database'

export function payoutLabel(model: PayoutModel, cents: number): string {
  const amt = `$${(cents / 100).toLocaleString('en-US')}`
  if (model === 'per_post') return `${amt} / post`
  if (model === 'per_1k_views') return `${amt} / 1k views`
  return `${amt} flat`
}

export const promoBadge: Record<PromoType, 'indigo' | 'purple' | 'blue' | 'green' | 'gray'> = {
  product: 'indigo',
  service: 'blue',
  business: 'gray',
  music: 'purple',
  content: 'green',
}
