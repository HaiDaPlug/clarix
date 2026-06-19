create table if not exists public.shared_reports (
  id uuid primary key default gen_random_uuid(),
  share_token_hash text not null unique check (share_token_hash ~ '^[a-f0-9]{64}$'),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  report_data jsonb not null,
  ai_insights jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.shared_reports enable row level security;

drop policy if exists "Owners can manage their shared reports" on public.shared_reports;
create policy "Owners can manage their shared reports"
  on public.shared_reports for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create index if not exists shared_reports_token_idx
  on public.shared_reports (share_token_hash);

create index if not exists shared_reports_owner_created_idx
  on public.shared_reports (owner_user_id, created_at desc);

create index if not exists shared_reports_expires_idx
  on public.shared_reports (expires_at)
  where expires_at is not null;
