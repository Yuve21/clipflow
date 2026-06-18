import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')
    // No apiVersion override — stripe v22 pins its own latest version
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return _stripe
}

export const PLATFORM_FEE_PCT = 0.04 // 4% on clipper→client invoices (Connect application fee)

export function platformFeeCents(totalCents: number): number {
  return Math.round(totalCents * PLATFORM_FEE_PCT)
}

// Marketplace: ClipFlow's cut of advertiser spend when a brand pays a clipper
// to promote. Applied on payout (payments land in a later migration).
export const MARKETPLACE_TAKE_PCT = 0.15 // 15%

export function marketplaceTakeCents(totalCents: number): number {
  return Math.round(totalCents * MARKETPLACE_TAKE_PCT)
}
