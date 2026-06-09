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
  created_at: string
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
