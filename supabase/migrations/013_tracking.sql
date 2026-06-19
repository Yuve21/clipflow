-- Tracked promotion links + click attribution (CJ.com-style, v1 = clicks).
-- Each participation gets a unique track_token; a public /r/[token] route logs a
-- click and redirects to the campaign asset.

alter table campaign_participations add column if not exists track_token text unique;
alter table campaign_participations add column if not exists click_count integer not null default 0;

create table if not exists tracking_clicks (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references campaign_participations(id) on delete cascade,
  referer text,
  ua text,
  created_at timestamptz not null default now()
);
create index if not exists tracking_clicks_part_idx on tracking_clicks(participation_id);

alter table tracking_clicks enable row level security;
-- Click rows are written via the service-role redirect route; readable by the
-- clipper who owns the participation or the campaign's brand owner.
create policy "read own tracking clicks" on tracking_clicks
  for select to authenticated using (
    exists (
      select 1 from campaign_participations p
      where p.id = tracking_clicks.participation_id
        and (is_workspace_member(p.clipper_workspace_id) or owns_campaign(p.campaign_id))
    )
  );

-- Atomic click record. Returns the destination asset_url (or null if no match).
create or replace function record_track_click(p_token text, p_referer text default null, p_ua text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  pid uuid;
  dest text;
begin
  update campaign_participations set click_count = click_count + 1
   where track_token = p_token
   returning id into pid;
  if pid is null then return null; end if;

  insert into tracking_clicks (participation_id, referer, ua) values (pid, p_referer, p_ua);

  select c.asset_url into dest
    from campaign_participations p
    join campaigns c on c.id = p.campaign_id
   where p.id = pid;

  return dest;
end; $$;
