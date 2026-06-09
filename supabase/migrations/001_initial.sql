-- ClipFlow initial schema
-- All RLS is scoped by workspace_id via workspace_members

-- ─── Workspaces ───────────────────────────────────────────────────────────────
create table workspaces (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name          text not null default 'My Workspace',
  plan          text not null default 'free' check (plan in ('free','pro')),
  stripe_customer_id text,
  created_at    timestamptz not null default now()
);

create table workspace_members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'owner' check (role in ('owner')),
  joined_at    timestamptz not null default now(),
  unique(workspace_id, user_id)
);

-- ─── Clients ──────────────────────────────────────────────────────────────────
create table clients (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null references workspaces(id) on delete cascade,
  name                    text not null,
  source_platform         text,
  rate_type               text not null default 'per_clip' check (rate_type in ('per_clip','retainer')),
  rate_amount             numeric(10,2),
  retainer_period         text,
  deliverables_per_period integer,
  review_mode             text not null default 'auto_post' check (review_mode in ('auto_post','notify_veto','review_first')),
  brand_notes             text,
  status                  text not null default 'pending_agreement' check (status in ('pending_agreement','active')),
  created_at              timestamptz not null default now()
);

-- ─── Posting accounts ─────────────────────────────────────────────────────────
create table posting_accounts (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  platform      text not null,
  handle        text not null,
  follower_count integer not null default 0,
  added_at      timestamptz not null default now()
);

-- ─── Client agreements ────────────────────────────────────────────────────────
create table client_agreements (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references clients(id) on delete cascade,
  term_version     text not null default 'v1',
  term_text        text not null,
  accepted         boolean not null default false,
  accepted_by_name text,
  accepted_at      timestamptz,
  token            text not null unique,
  created_at       timestamptz not null default now()
);

-- ─── Sources ──────────────────────────────────────────────────────────────────
create table sources (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  title       text not null,
  url         text,
  received_at timestamptz not null default now(),
  status      text not null default 'new' check (status in ('new','in_progress','done'))
);

-- ─── Clips ────────────────────────────────────────────────────────────────────
create table clips (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references clients(id) on delete cascade,
  source_id          uuid references sources(id) on delete set null,
  title              text not null,
  status             text not null default 'todo' check (status in ('todo','editing','ready','posted','flagged')),
  due_date           date,
  current_version_id uuid,
  created_at         timestamptz not null default now()
);

create table clip_versions (
  id          uuid primary key default gen_random_uuid(),
  clip_id     uuid not null references clips(id) on delete cascade,
  version_no  integer not null default 1,
  file_url    text,
  uploaded_at timestamptz not null default now()
);

-- back-ref: clips.current_version_id → clip_versions
alter table clips add constraint clips_current_version_fk
  foreign key (current_version_id) references clip_versions(id) on delete set null;

-- ─── Posts ────────────────────────────────────────────────────────────────────
create table posts (
  id                 uuid primary key default gen_random_uuid(),
  clip_id            uuid not null references clips(id) on delete cascade,
  posting_account_id uuid not null references posting_accounts(id) on delete restrict,
  url                text,
  posted_at          timestamptz not null default now(),
  views              integer
);

-- ─── Invoices ─────────────────────────────────────────────────────────────────
create table invoices (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  line_items   jsonb not null default '[]',
  total        numeric(10,2) not null default 0,
  status       text not null default 'draft' check (status in ('draft','sent','paid')),
  issued_at    timestamptz,
  paid_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table workspaces         enable row level security;
alter table workspace_members  enable row level security;
alter table clients            enable row level security;
alter table posting_accounts   enable row level security;
alter table client_agreements  enable row level security;
alter table sources            enable row level security;
alter table clips              enable row level security;
alter table clip_versions      enable row level security;
alter table posts              enable row level security;
alter table invoices           enable row level security;

-- Helper: is the current user a member of a given workspace?
create or replace function is_workspace_member(ws_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

-- Helper: get workspace_id from a client_id (used for nested-table policies)
create or replace function client_workspace_id(c_id uuid)
returns uuid language sql security definer as $$
  select workspace_id from clients where id = c_id;
$$;

-- workspaces
create policy "workspace members can read"
  on workspaces for select using (is_workspace_member(id));
create policy "workspace owner can update"
  on workspaces for update using (owner_user_id = auth.uid());

-- workspace_members
create policy "members can see their memberships"
  on workspace_members for select using (user_id = auth.uid() or is_workspace_member(workspace_id));
create policy "members can insert own"
  on workspace_members for insert with check (user_id = auth.uid());

-- clients
create policy "workspace members can crud clients"
  on clients for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- posting_accounts
create policy "workspace members can crud posting_accounts"
  on posting_accounts for all
  using (is_workspace_member(client_workspace_id(client_id)))
  with check (is_workspace_member(client_workspace_id(client_id)));

-- client_agreements (public read by token handled in API routes / service role)
create policy "workspace members can read agreements"
  on client_agreements for select
  using (is_workspace_member(client_workspace_id(client_id)));
create policy "workspace members can insert agreements"
  on client_agreements for insert
  with check (is_workspace_member(client_workspace_id(client_id)));
create policy "workspace members can update agreements"
  on client_agreements for update
  using (is_workspace_member(client_workspace_id(client_id)));

-- sources
create policy "workspace members can crud sources"
  on sources for all
  using (is_workspace_member(client_workspace_id(client_id)))
  with check (is_workspace_member(client_workspace_id(client_id)));

-- clips
create policy "workspace members can crud clips"
  on clips for all
  using (is_workspace_member(client_workspace_id(client_id)))
  with check (is_workspace_member(client_workspace_id(client_id)));

-- clip_versions
create or replace function clip_workspace_id(cv_clip_id uuid)
returns uuid language sql security definer as $$
  select workspace_id from clients c
  join clips cl on cl.client_id = c.id
  where cl.id = cv_clip_id;
$$;
create policy "workspace members can crud clip_versions"
  on clip_versions for all
  using (is_workspace_member(clip_workspace_id(clip_id)))
  with check (is_workspace_member(clip_workspace_id(clip_id)));

-- posts
create or replace function post_workspace_id(p_clip_id uuid)
returns uuid language sql security definer as $$
  select workspace_id from clients c
  join clips cl on cl.client_id = c.id
  where cl.id = p_clip_id;
$$;
create policy "workspace members can crud posts"
  on posts for all
  using (is_workspace_member(post_workspace_id(clip_id)))
  with check (is_workspace_member(post_workspace_id(clip_id)));

-- invoices
create policy "workspace members can crud invoices"
  on invoices for all
  using (is_workspace_member(client_workspace_id(client_id)))
  with check (is_workspace_member(client_workspace_id(client_id)));

-- ─── Auto-create workspace on signup ──────────────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_workspace_id uuid;
begin
  insert into workspaces (owner_user_id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1) || '''s Workspace'))
  returning id into new_workspace_id;

  insert into workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
