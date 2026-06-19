'use client'

import { useEffect } from 'react'

// Fires once on dashboard load: if a referral code was captured at login
// (localStorage 'cf_ref'), attribute it. The API is idempotent.
export function ReferralClaim() {
  useEffect(() => {
    const code = localStorage.getItem('cf_ref')
    if (!code) return
    fetch('/api/referrals/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(() => localStorage.removeItem('cf_ref'))
      .catch(() => {})
  }, [])
  return null
}
