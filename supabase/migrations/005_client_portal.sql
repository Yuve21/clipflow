-- Add portal token to clients so clippers can share a public view with their clients
alter table clients add column if not exists portal_token text unique;

-- Backfill existing rows with a random token
update clients set portal_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '') where portal_token is null;

-- Make it not-null going forward (new rows set it in the API)
alter table clients alter column portal_token set not null;

-- Public read policy: anyone with the token can read limited client data
-- (Used by /portal/[token] route via service role, so no RLS needed here)
-- Workspace members already covered by existing policy
