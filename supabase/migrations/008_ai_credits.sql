-- Usage-based AI Clipper billing.
-- 1 credit = 1 AI clip-generation job. Pure pay-per-use; credits bought in packs
-- via Stripe Checkout (platform charges = ClipFlow revenue). New/existing
-- workspaces get 2 free trial credits.

alter table workspaces
  add column if not exists ai_credits integer not null default 2;

-- Grant existing workspaces the 2 free trial credits (default only applies to new rows)
update workspaces set ai_credits = 2 where ai_credits = 0;

-- Per-job usage + cost ledger (drives internal margin analytics)
create table if not exists ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  job_id uuid references ai_jobs(id) on delete set null,
  source_seconds numeric(10,2),
  whisper_minutes numeric(10,2),
  gpt_input_tokens integer,
  gpt_output_tokens integer,
  est_cost_cents numeric(10,4),
  credits_charged integer not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_events_workspace_idx on ai_usage_events(workspace_id);

-- Credit purchases (Stripe Checkout sessions). Platform charges, not Connect transfers.
create table if not exists credit_purchases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  pack_id text not null,
  credits integer not null,
  amount_cents integer not null,
  stripe_checkout_session_id text,
  status text not null default 'pending' check (status in ('pending','paid','canceled')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists credit_purchases_workspace_idx on credit_purchases(workspace_id);

-- RLS: members can read their own usage/purchases; all writes go through the
-- service-role admin client (which bypasses RLS).
alter table ai_usage_events enable row level security;
alter table credit_purchases enable row level security;

create policy "members read own usage" on ai_usage_events
  for select using (is_workspace_member(workspace_id));
create policy "members read own purchases" on credit_purchases
  for select using (is_workspace_member(workspace_id));

-- Atomically consume one credit iff the balance is positive. Returns true if a
-- credit was actually taken (prevents races / negative balances).
create or replace function consume_ai_credit(p_workspace_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update workspaces set ai_credits = ai_credits - 1
   where id = p_workspace_id and ai_credits > 0;
  get diagnostics n = row_count;
  return n > 0;
end; $$;

-- Add credits (grant on purchase, or refund a pre-processing failure). Returns new balance.
create or replace function add_ai_credits(p_workspace_id uuid, p_amount integer)
returns integer language plpgsql security definer set search_path = public as $$
declare new_balance integer;
begin
  update workspaces set ai_credits = ai_credits + p_amount
   where id = p_workspace_id
   returning ai_credits into new_balance;
  return new_balance;
end; $$;
