export type Plan = 'free' | 'pro'
export type RateType = 'per_clip' | 'retainer'
export type ReviewMode = 'auto_post' | 'notify_veto' | 'review_first'
export type ClientStatus = 'pending_agreement' | 'active'
export type ClipStatus = 'todo' | 'editing' | 'ready' | 'posted' | 'flagged'
export type InvoiceStatus = 'draft' | 'sent' | 'paid'
export type SourceStatus = 'new' | 'in_progress' | 'done'

export interface Workspace {
  id: string
  owner_user_id: string
  name: string
  plan: Plan
  stripe_customer_id: string | null
  ai_credits: number
  referral_code: string | null
  created_at: string
}

export type CreditPurchaseStatus = 'pending' | 'paid' | 'canceled'

export interface CreditPurchase {
  id: string
  workspace_id: string
  pack_id: string
  credits: number
  amount_cents: number
  stripe_checkout_session_id: string | null
  status: CreditPurchaseStatus
  created_at: string
  paid_at: string | null
}

export interface AiUsageEvent {
  id: string
  workspace_id: string
  job_id: string | null
  source_seconds: number | null
  whisper_minutes: number | null
  gpt_input_tokens: number | null
  gpt_output_tokens: number | null
  est_cost_cents: number | null
  credits_charged: number
  created_at: string
}

// ── Marketplace ───────────────────────────────────────────────────────────────
export type PromoType = 'product' | 'service' | 'business' | 'music' | 'content'
export type PayoutModel = 'per_post' | 'per_1k_views' | 'flat'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'closed'
export type ParticipationStatus = 'applied' | 'approved' | 'rejected' | 'active' | 'completed'

export interface ContentCategory {
  slug: string
  label: string
  sort: number
}

export interface ClipperProfile {
  workspace_id: string
  display_name: string
  bio: string | null
  is_listed: boolean
  min_rate_cents: number | null
  total_followers: number | null
  referred_by: string | null
  created_at: string
}

export interface Brand {
  id: string
  workspace_id: string
  name: string
  tagline: string | null
  website: string | null
  description: string | null
  logo_url: string | null
  is_listed: boolean
  created_at: string
}

export interface Campaign {
  id: string
  brand_id: string
  title: string
  description: string | null
  promo_type: PromoType
  payout_model: PayoutModel
  payout_cents: number
  budget_cents: number
  status: CampaignStatus
  asset_url: string | null
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

export interface CampaignParticipation {
  id: string
  campaign_id: string
  clipper_workspace_id: string
  status: ParticipationStatus
  pitch: string | null
  track_token: string | null
  click_count: number
  applied_at: string
  decided_at: string | null
}

export type PayoutStatus = 'pending' | 'paid' | 'transferred' | 'failed'

export interface MarketplacePayout {
  id: string
  campaign_id: string | null
  participation_id: string | null
  brand_workspace_id: string
  clipper_workspace_id: string
  gross_cents: number
  take_cents: number
  net_cents: number
  stripe_checkout_session_id: string | null
  stripe_transfer_id: string | null
  status: PayoutStatus
  note: string | null
  created_at: string
  paid_at: string | null
}

export interface Referral {
  id: string
  referrer_workspace_id: string
  code: string
  referred_workspace_id: string | null
  status: 'pending' | 'signed_up' | 'rewarded'
  reward_credits: number
  created_at: string
  converted_at: string | null
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner'
  joined_at: string
}

export interface Client {
  id: string
  workspace_id: string
  name: string
  source_platform: string | null
  rate_type: RateType
  rate_amount: number | null
  retainer_period: string | null
  deliverables_per_period: number | null
  review_mode: ReviewMode
  brand_notes: string | null
  status: ClientStatus
  created_at: string
}

export interface PostingAccount {
  id: string
  client_id: string
  platform: string
  handle: string
  follower_count: number
  added_at: string
}

export interface ClientAgreement {
  id: string
  client_id: string
  term_version: string
  term_text: string
  accepted: boolean
  accepted_by_name: string | null
  accepted_at: string | null
  token: string
  created_at: string
}

export interface Source {
  id: string
  client_id: string
  title: string
  url: string | null
  received_at: string
  status: SourceStatus
}

export interface Clip {
  id: string
  client_id: string
  source_id: string | null
  title: string
  status: ClipStatus
  due_date: string | null
  current_version_id: string | null
  created_at: string
}

export interface ClipVersion {
  id: string
  clip_id: string
  version_no: number
  file_url: string | null
  uploaded_at: string
}

export interface Post {
  id: string
  clip_id: string
  posting_account_id: string
  url: string | null
  posted_at: string
  views: number | null
}

export interface Invoice {
  id: string
  client_id: string
  period_start: string
  period_end: string
  line_items: LineItem[]
  total: number
  status: InvoiceStatus
  issued_at: string | null
  paid_at: string | null
  created_at: string
}

export interface LineItem {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

// ─── AI Clipper ───────────────────────────────────────────────────────────────
export type AiJobStatus = 'uploading' | 'processing' | 'done' | 'error'
export type CutStatus = 'pending' | 'cutting' | 'done' | 'error'

export interface AiJob {
  id: string
  workspace_id: string
  client_id: string | null
  video_path: string
  video_filename: string
  max_clips: number
  min_duration_s: number
  max_duration_s: number
  status: AiJobStatus
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface AiClipSuggestion {
  id: string
  job_id: string
  workspace_id: string
  title: string
  start_time: number
  end_time: number
  viral_score: number
  text_score: number | null
  audio_score: number | null
  visual_score: number | null
  visual_analysis: string | null
  hook: string
  reason: string
  clip_id: string | null
  cut_status: CutStatus
  cut_error: string | null
  output_path: string | null
  created_at: string
}
