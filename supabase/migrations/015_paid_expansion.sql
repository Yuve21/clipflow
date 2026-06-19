-- Paid expansion: boosted listings + AI clipper-matching + conversion tracking.
-- Credits become the unified paid currency (AI jobs, matching, boosts) so brands
-- buy credits too — monetizing the demand side, not just clippers.

-- Atomic multi-credit consume (boosts cost several credits; matching costs 1).
create or replace function consume_ai_credits(p_workspace_id uuid, p_n integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare m integer;
begin
  if p_n <= 0 then return true; end if;
  update workspaces set ai_credits = ai_credits - p_n
   where id = p_workspace_id and ai_credits >= p_n;
  get diagnostics m = row_count;
  return m > 0;
end; $$;

-- Boosted/featured listings: surfaced first in discovery until the timestamp passes.
alter table campaigns add column if not exists boosted_until timestamptz;
alter table clipper_profiles add column if not exists boosted_until timestamptz;

-- Conversion tracking (CJ.com-style postback). A brand fires /c/[token] on their
-- thank-you page; we attribute a conversion (optional value) to the participation.
create table if not exists tracking_conversions (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references campaign_participations(id) on delete cascade,
  value_cents integer,
  created_at timestamptz not null default now()
);
create index if not exists tracking_conversions_part_idx on tracking_conversions(participation_id);

alter table tracking_conversions enable row level security;
create policy "read own conversions" on tracking_conversions
  for select to authenticated using (
    exists (
      select 1 from campaign_participations p
      where p.id = tracking_conversions.participation_id
        and (is_workspace_member(p.clipper_workspace_id) or owns_campaign(p.campaign_id))
    )
  );

create or replace function record_conversion(p_token text, p_value_cents integer default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  select id into pid from campaign_participations where track_token = p_token;
  if pid is null then return false; end if;
  insert into tracking_conversions (participation_id, value_cents) values (pid, p_value_cents);
  return true;
end; $$;
