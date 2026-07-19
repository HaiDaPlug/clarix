create table if not exists google_report_cache (
  user_id uuid references auth.users(id) on delete cascade not null,
  source text not null,
  property_id text not null,
  period_start date not null,
  period_end date not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (user_id, source, property_id, period_start, period_end)
);

alter table google_report_cache enable row level security;

create policy "Users can read own report cache"
  on google_report_cache for select
  using (auth.uid() = user_id);

create policy "Users can insert own report cache"
  on google_report_cache for insert
  with check (auth.uid() = user_id);

create policy "Users can update own report cache"
  on google_report_cache for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own report cache"
  on google_report_cache for delete
  using (auth.uid() = user_id);
