// AI Clipper credits — pure pay-per-use. 1 credit = 1 clip-generation job.
// Credits are sold in packs via Stripe Checkout (platform charges = ClipFlow revenue).

export interface CreditPack {
  id: string
  label: string
  credits: number
  priceCents: number
}

// True cost per job ≈ $0.24–$0.55 (Whisper-dominated), so these margins run ~73–88%.
export const CREDIT_PACKS: CreditPack[] = [
  { id: 'starter', label: 'Starter', credits: 5, priceCents: 1000 }, // $2.00 / credit
  { id: 'creator', label: 'Creator', credits: 15, priceCents: 2500 }, // $1.67 / credit
  { id: 'studio', label: 'Studio', credits: 40, priceCents: 6000 }, // $1.50 / credit
  { id: 'agency', label: 'Agency', credits: 100, priceCents: 12000 }, // $1.20 / credit
]

export function getPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id)
}

export function perCreditCents(pack: CreditPack): number {
  return Math.round(pack.priceCents / pack.credits)
}

// Hard cap on source video length per job — bounds both OpenAI cost and the
// 300s serverless function timeout.
export const MAX_SOURCE_SECONDS = 90 * 60 // 90 minutes

// OpenAI unit costs (USD), for internal margin metering only.
// Re-confirm against the live OpenAI pricing page before relying on these.
export const COST = {
  whisperPerMinute: 0.006,
  gpt4oInputPerMTok: 2.5,
  gpt4oOutputPerMTok: 10.0,
  // Flat allowance for the GPT-4o Vision pass (~$0.01, scales with clip count not duration)
  visionFlatCents: 1.1,
}

export function estimateJobCostCents(opts: {
  sourceSeconds: number
  gptInputTokens: number
  gptOutputTokens: number
}): number {
  const whisper = (opts.sourceSeconds / 60) * COST.whisperPerMinute
  const gptIn = (opts.gptInputTokens / 1_000_000) * COST.gpt4oInputPerMTok
  const gptOut = (opts.gptOutputTokens / 1_000_000) * COST.gpt4oOutputPerMTok
  return (whisper + gptIn + gptOut) * 100 + COST.visionFlatCents
}
