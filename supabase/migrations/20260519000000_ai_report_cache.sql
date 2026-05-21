create table if not exists ai_report_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  period_start date not null,
  period_end date not null,
  metrics_hash text not null,
  generated_at timestamptz not null default now(),
  insights jsonb not null,
  unique (user_id, period_start, period_end)
);

alter table ai_report_cache enable row level security;

create policy "Users can read own cache"
  on ai_report_cache for select
  using (auth.uid() = user_id);

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

create index ai_report_cache_user_period
  on ai_report_cache (user_id, period_start, period_end);
