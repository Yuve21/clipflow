-- Marketplace payments: a brand pays an approved clipper. The brand pays the
-- gross via Stripe Checkout (platform charge); ClipFlow keeps a 15% take and
-- transfers the net (85%) to the clipper's connected Stripe account.

create table if not exists marketplace_payouts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete set null,
  participation_id uuid references campaign_participations(id) on delete set null,
  brand_workspace_id uuid not null references workspaces(id) on delete cascade,
  clipper_workspace_id uuid not null references workspaces(id) on delete cascade,
  gross_cents integer not null,
  take_cents integer not null,
  net_cents integer not null,
  stripe_checkout_session_id text,
  stripe_transfer_id text,
  status text not null default 'pending'
    check (status in ('pending','paid','transferred','failed')),
  note text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists payouts_brand_idx on marketplace_payouts(brand_workspace_id);
create index if not exists payouts_clipper_idx on marketplace_payouts(clipper_workspace_id);

alter table marketplace_payouts enable row level security;

-- Both sides can see a payout; all writes happen via the service-role client.
create policy "read own payouts" on marketplace_payouts
  for select to authenticated
  using (is_workspace_member(brand_workspace_id) or is_workspace_member(clipper_workspace_id));
