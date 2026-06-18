-- CJ.com-style two-sided promotion marketplace, added ALONGSIDE clipper ops.
-- Brands/advertisers pay clippers to promote products / services / music / content
-- across social media. ClipFlow takes a % of advertiser spend (payments land in a
-- later migration). A workspace can be a clipper (discoverable profile), a brand
-- (runs campaigns), or both.

-- ── Content taxonomy (shared by clipper niches + campaign targeting/filters) ──
create table if not exists content_categories (
  slug text primary key,
  label text not null,
  sort integer not null default 0
);
insert into content_categories (slug, label, sort) values
  ('gaming','Gaming',1),('music','Music',2),('comedy','Comedy',3),
  ('finance','Finance & Crypto',4),('fitness','Fitness',5),('beauty','Beauty & Fashion',6),
  ('tech','Tech',7),('sports','Sports',8),('podcasts','Podcasts',9),
  ('education','Education',10),('food','Food & Drink',11),('travel','Travel',12),
  ('lifestyle','Lifestyle',13),('business','Business',14),('news','News & Politics',15)
on conflict (slug) do nothing;

-- ── Clipper marketplace profile (opt-in to be discoverable by advertisers) ────
create table if not exists clipper_profiles (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  display_name text not null,
  bio text,
  is_listed boolean not null default false,
  min_rate_cents integer,
  total_followers integer default 0,
  referred_by uuid references workspaces(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists clipper_categories (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  category_slug text not null references content_categories(slug) on delete cascade,
  primary key (workspace_id, category_slug)
);

-- ── Brands / advertisers (owned by a workspace) ───────────────────────────────
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  website text,
  description text,
  logo_url text,
  created_at timestamptz not null default now()
);
create index if not exists brands_workspace_idx on brands(workspace_id);

-- ── Campaigns (what a brand wants promoted) ───────────────────────────────────
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  title text not null,
  description text,
  promo_type text not null default 'product'
    check (promo_type in ('product','service','business','music','content')),
  payout_model text not null default 'per_post'
    check (payout_model in ('per_post','per_1k_views','flat')),
  payout_cents integer not null default 0,   -- per unit: per post / per 1k views / flat
  budget_cents integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft','active','paused','closed')),
  asset_url text,                            -- product page / music link / asset to promote
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now()
);
create index if not exists campaigns_status_idx on campaigns(status);
create index if not exists campaigns_brand_idx on campaigns(brand_id);

create table if not exists campaign_categories (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  category_slug text not null references content_categories(slug) on delete cascade,
  primary key (campaign_id, category_slug)
);

-- ── Clipper joining/applying to a campaign ────────────────────────────────────
create table if not exists campaign_participations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  clipper_workspace_id uuid not null references workspaces(id) on delete cascade,
  status text not null default 'applied'
    check (status in ('applied','approved','rejected','active','completed')),
  pitch text,
  applied_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (campaign_id, clipper_workspace_id)
);
create index if not exists participations_campaign_idx on campaign_participations(campaign_id);
create index if not exists participations_clipper_idx on campaign_participations(clipper_workspace_id);

-- ── Clipper → clipper referrals ───────────────────────────────────────────────
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_workspace_id uuid not null references workspaces(id) on delete cascade,
  code text not null unique,
  referred_workspace_id uuid references workspaces(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','signed_up','rewarded')),
  created_at timestamptz not null default now(),
  converted_at timestamptz
);
create index if not exists referrals_referrer_idx on referrals(referrer_workspace_id);

-- ── Ownership helpers (SECURITY DEFINER, build on is_workspace_member from 001) ─
create or replace function owns_brand(p_brand_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select is_workspace_member(b.workspace_id) from brands b where b.id = p_brand_id;
$$;

create or replace function owns_campaign(p_campaign_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select owns_brand(c.brand_id) from campaigns c where c.id = p_campaign_id;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table content_categories enable row level security;
alter table clipper_profiles enable row level security;
alter table clipper_categories enable row level security;
alter table brands enable row level security;
alter table campaigns enable row level security;
alter table campaign_categories enable row level security;
alter table campaign_participations enable row level security;
alter table referrals enable row level security;

-- Reference data: any authenticated user can read
create policy "read categories" on content_categories
  for select to authenticated using (true);

-- Clipper profiles: listed ones are public to authed users; own always; own writes
create policy "read listed or own profile" on clipper_profiles
  for select to authenticated using (is_listed or is_workspace_member(workspace_id));
create policy "write own profile" on clipper_profiles
  for all to authenticated using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

create policy "read clipper categories" on clipper_categories
  for select to authenticated using (true);
create policy "write own clipper categories" on clipper_categories
  for all to authenticated using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- Brands: readable by authed users (shown on campaigns); writable by owner
create policy "read brands" on brands
  for select to authenticated using (true);
create policy "write own brands" on brands
  for all to authenticated using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- Campaigns: active ones are discoverable cross-tenant; owners see all their own
create policy "read active or own campaigns" on campaigns
  for select to authenticated using (status = 'active' or owns_campaign(id));
create policy "insert own campaigns" on campaigns
  for insert to authenticated with check (owns_brand(brand_id));
create policy "update own campaigns" on campaigns
  for update to authenticated using (owns_campaign(id)) with check (owns_campaign(id));
create policy "delete own campaigns" on campaigns
  for delete to authenticated using (owns_campaign(id));

create policy "read campaign categories" on campaign_categories
  for select to authenticated using (true);
create policy "write own campaign categories" on campaign_categories
  for all to authenticated using (owns_campaign(campaign_id)) with check (owns_campaign(campaign_id));

-- Participations: visible to the clipper and the campaign's brand owner
create policy "read own participations" on campaign_participations
  for select to authenticated using (is_workspace_member(clipper_workspace_id) or owns_campaign(campaign_id));
create policy "clipper applies" on campaign_participations
  for insert to authenticated with check (is_workspace_member(clipper_workspace_id));
create policy "clipper or brand updates participation" on campaign_participations
  for update to authenticated
  using (is_workspace_member(clipper_workspace_id) or owns_campaign(campaign_id))
  with check (is_workspace_member(clipper_workspace_id) or owns_campaign(campaign_id));

-- Referrals: only the referrer
create policy "read own referrals" on referrals
  for select to authenticated using (is_workspace_member(referrer_workspace_id));
create policy "create own referrals" on referrals
  for insert to authenticated with check (is_workspace_member(referrer_workspace_id));
