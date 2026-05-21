drop policy if exists "Service role can write cache" on ai_report_cache;
drop policy if exists "Users can insert own cache" on ai_report_cache;
drop policy if exists "Users can update own cache" on ai_report_cache;
drop policy if exists "Service role can manage cache" on ai_report_cache;

create policy "Users can insert own cache"
  on ai_report_cache for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cache"
  on ai_report_cache for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Service role can manage cache"
  on ai_report_cache for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
