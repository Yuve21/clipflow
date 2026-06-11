-- Fix storage RLS: scope uploads to the uploader's own workspace paths
-- Previously any authenticated user could upload to any workspace's path

drop policy if exists "authenticated can upload ai source videos" on storage.objects;
drop policy if exists "authenticated can upload ai cut clips" on storage.objects;
drop policy if exists "authenticated can read ai cut clips" on storage.objects;
drop policy if exists "authenticated can read ai source videos" on storage.objects;

-- Upload: path must start with one of the user's workspace IDs
create policy "workspace members can upload ai source videos"
  on storage.objects for insert
  with check (
    bucket_id = 'ai-source-videos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] in (
      select workspace_id::text from workspace_members where user_id = auth.uid()
    )
  );

create policy "workspace members can upload ai cut clips"
  on storage.objects for insert
  with check (
    bucket_id = 'ai-cut-clips'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] in (
      select workspace_id::text from workspace_members where user_id = auth.uid()
    )
  );

-- Read: same workspace restriction
create policy "workspace members can read ai source videos"
  on storage.objects for select
  using (
    bucket_id = 'ai-source-videos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] in (
      select workspace_id::text from workspace_members where user_id = auth.uid()
    )
  );

create policy "workspace members can read ai cut clips"
  on storage.objects for select
  using (
    bucket_id = 'ai-cut-clips'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] in (
      select workspace_id::text from workspace_members where user_id = auth.uid()
    )
  );
