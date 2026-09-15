-- The legacy connected_sources table still carries plaintext Google tokens
-- (kept as the rollback path for 20260914000000). Until it is dropped, the
-- browser must not be able to read them: the app no longer touches this
-- table, and the new google_connections table is service-role only, so the
-- old own-row policy would leave the very exposure the new design removes.
--
-- After this migration only service_role can read/write connected_sources.
--
-- To roll back the application code to the pre-workspace version, restore
-- browser access first:
--   grant select, insert, update, delete on public.connected_sources to authenticated;
--   create policy "Users can manage their own sources" on public.connected_sources
--     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own sources" on public.connected_sources;

revoke all on table public.connected_sources from anon, authenticated;

-- RLS stays enabled with no policies: even a stray grant would expose nothing.
alter table public.connected_sources enable row level security;
