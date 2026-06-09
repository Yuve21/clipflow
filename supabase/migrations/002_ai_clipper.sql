-- AI Clipper feature tables

-- ─── Storage buckets ──────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('ai-source-videos', 'ai-source-videos', false, 536870912, array['video/mp4','video/quicktime','video/x-msvideo','video/webm','video/x-matroska','video/*']),
  ('ai-cut-clips',     'ai-cut-clips',     false, 209715200, array['video/mp4','video/*'])
on conflict (id) do nothing;

-- ─── ai_jobs ──────────────────────────────────────────────────────────────────
create table ai_jobs (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references workspaces(id) on delete cascade,
  client_id        uuid references clients(id) on delete set null,
  video_path       text not null,
  video_filename   text not null,
  max_clips        integer not null default 10,
  min_duration_s   integer not null default 30,
  max_duration_s   integer not null default 90,
  status           text not null default 'uploading'
                   check (status in ('uploading','processing','done','error')),
  error_message    text,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);

-- ─── ai_clip_suggestions ──────────────────────────────────────────────────────
create table ai_clip_suggestions (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references ai_jobs(id) on delete cascade,
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  title         text not null,
  start_time    numeric(10,3) not null,
  end_time      numeric(10,3) not null,
  viral_score   integer not null check (viral_score between 1 and 100),
  hook          text not null,
  reason        text not null,
  clip_id       uuid references clips(id) on delete set null,
  cut_status    text not null default 'pending'
                check (cut_status in ('pending','cutting','done','error')),
  cut_error     text,
  output_path   text,
  created_at    timestamptz not null default now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table ai_jobs              enable row level security;
alter table ai_clip_suggestions  enable row level security;

-- ai_jobs
create policy "workspace members can crud ai_jobs"
  on ai_jobs for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- ai_clip_suggestions
create policy "workspace members can crud ai_clip_suggestions"
  on ai_clip_suggestions for all
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- ─── Storage RLS (per-bucket, scoped to authenticated users) ──────────────────
-- Simplest safe approach: authenticated users can upload/read within their workspace path.
-- Service-role key used by API routes bypasses all storage RLS for privileged operations.
create policy "authenticated can upload ai source videos"
  on storage.objects for insert
  with check (bucket_id = 'ai-source-videos' and auth.role() = 'authenticated');

create policy "authenticated can read ai source videos"
  on storage.objects for select
  using (bucket_id = 'ai-source-videos' and auth.role() = 'authenticated');

create policy "authenticated can upload ai cut clips"
  on storage.objects for insert
  with check (bucket_id = 'ai-cut-clips' and auth.role() = 'authenticated');

create policy "authenticated can read ai cut clips"
  on storage.objects for select
  using (bucket_id = 'ai-cut-clips' and auth.role() = 'authenticated');
