create table if not exists public.connected_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('ga4', 'gsc', 'google_ads')),
  property_id text not null,
  display_name text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source)
);

alter table public.connected_sources enable row level security;

drop policy if exists "Users can manage their own sources" on public.connected_sources;

create policy "Users can manage their own sources"
  on public.connected_sources for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_connected_sources_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists connected_sources_set_updated_at on public.connected_sources;

create trigger connected_sources_set_updated_at
  before update on public.connected_sources
  for each row
  execute function public.set_connected_sources_updated_at();
