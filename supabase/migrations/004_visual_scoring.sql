-- Add multi-signal virality scoring columns to ai_clip_suggestions
alter table ai_clip_suggestions
  add column if not exists text_score    integer check (text_score between 1 and 100),
  add column if not exists audio_score   integer check (audio_score between 1 and 100),
  add column if not exists visual_score  integer check (visual_score between 1 and 100),
  add column if not exists visual_analysis text;

-- Fix handle_new_user trigger (drop+recreate to ensure clean state)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  ws_id uuid;
  ws_name text;
begin
  ws_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1) || '''s Workspace'
  );

  insert into public.workspaces (owner_user_id, name)
  values (new.id, ws_name)
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
