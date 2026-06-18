-- Fix handle_new_user trigger: add explicit search_path so auth.users trigger
-- can find the public.workspaces and public.workspace_members tables.
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  insert into workspaces (owner_user_id, name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1) || '''s Workspace'
    )
  )
  returning id into new_workspace_id;

  insert into workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  return new;
end;
$$;
