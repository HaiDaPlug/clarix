create table if not exists public.auth_failures (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reason text not null,
  detail text,
  status int
);

alter table public.auth_failures enable row level security;

-- Written from /auth/callback before any session exists (the request that
-- failed to authenticate), so inserts must be allowed unauthenticated. No
-- select/update/delete policy is defined — read via the Supabase dashboard
-- (service_role) only.
drop policy if exists "Anyone can log an auth failure" on public.auth_failures;
create policy "Anyone can log an auth failure"
  on public.auth_failures for insert
  to anon, authenticated
  with check (true);

create index if not exists auth_failures_created_at_idx
  on public.auth_failures (created_at desc);
