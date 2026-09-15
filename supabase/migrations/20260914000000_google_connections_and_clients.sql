-- Separates "who is signed in to Clarix" from "which Google grant can we use",
-- and introduces explicit customer workspaces so a report can only ever be
-- built from one deliberately selected GA4 property + one GSC property.
--
--   google_connections  one Google OAuth grant per Clarix user (server-only)
--   clients             customer workspaces ("Kunder"); exactly one is active
--   client_sources      the GA4 / GSC property each workspace uses
--
-- connected_sources is NOT dropped. Its rows are copied forward below and the
-- table stays as the rollback path. Drop it in a later migration once the new
-- flow has been verified in production.

-- ─── shared updated_at trigger ───────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── google_connections ──────────────────────────────────────────────────────

create table if not exists public.google_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  -- 'active'             the grant is usable (or refreshable)
  -- 'reconnect_required' Google rejected the grant permanently; user must re-authorize
  status text not null default 'active'
    check (status in ('active', 'reconnect_required')),
  status_reason text,
  connected_at timestamptz not null default now(),
  last_refreshed_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_connections enable row level security;

-- Deliberately no RLS policies: refresh tokens are long-lived credentials and
-- must only be readable by the server (service role). The browser's anon key +
-- user JWT gets nothing from this table.
revoke all on table public.google_connections from anon, authenticated;

drop trigger if exists google_connections_set_updated_at on public.google_connections;
create trigger google_connections_set_updated_at
  before update on public.google_connections
  for each row execute function public.set_updated_at();

-- ─── clients (workspaces) ────────────────────────────────────────────────────

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  domain text check (domain is null or char_length(domain) <= 253),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one active workspace per user, enforced by the database.
create unique index if not exists clients_one_active_per_user
  on public.clients (user_id) where is_active;

create index if not exists clients_user_created_idx
  on public.clients (user_id, created_at);

alter table public.clients enable row level security;

drop policy if exists "Users can manage their own clients" on public.clients;
create policy "Users can manage their own clients"
  on public.clients for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ─── client_sources ──────────────────────────────────────────────────────────

create table if not exists public.client_sources (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('ga4', 'gsc', 'google_ads')),
  property_id text not null check (char_length(property_id) between 1 and 512),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One property per source per workspace. This is what makes merging two GA4
  -- properties into one report structurally impossible.
  unique (client_id, source)
);

create index if not exists client_sources_user_idx
  on public.client_sources (user_id, source);

alter table public.client_sources enable row level security;

drop policy if exists "Users can manage their own client sources" on public.client_sources;
create policy "Users can manage their own client sources"
  on public.client_sources for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists client_sources_set_updated_at on public.client_sources;
create trigger client_sources_set_updated_at
  before update on public.client_sources
  for each row execute function public.set_updated_at();

-- ─── set_active_client ───────────────────────────────────────────────────────
-- Atomically makes one workspace active. Two statements from the client would
-- leave a window with zero or two active rows; the partial unique index above
-- would reject the latter, so switching is done here in one transaction.

create or replace function public.set_active_client(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.clients where id = p_client_id and user_id = v_user_id
  ) then
    raise exception 'client not found' using errcode = 'no_data_found';
  end if;

  update public.clients
     set is_active = false
   where user_id = v_user_id and is_active and id <> p_client_id;

  update public.clients
     set is_active = true
   where id = p_client_id and user_id = v_user_id and not is_active;
end;
$$;

revoke all on function public.set_active_client(uuid) from public;
grant execute on function public.set_active_client(uuid) to authenticated, service_role;

-- ─── backfill helpers ────────────────────────────────────────────────────────

-- "Acme AB - GA4" → "Acme AB". Mirrors cleanPropertyDisplayName() in
-- src/lib/clients/naming.ts so migrated workspace names match what the app
-- would have produced.
create or replace function public.clean_legacy_property_name(p_name text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      btrim(
        regexp_replace(
          regexp_replace(
            p_name,
            '[[:space:]\-–|]+(GA4|Google Analytics 4|Google Analytics|Analytics|GSC|Google Search Console|Search Console|Google Ads|Ads)[[:space:]]*$',
            '', 'i'
          ),
          '^[[:space:]]*(GA4|Google Analytics 4|Google Analytics|Analytics|GSC|Google Search Console|Search Console|Google Ads|Ads)[[:space:]\-–|]+',
          '', 'i'
        )
      ),
      ''
    ),
    p_name
  );
$$;

-- 'sc-domain:example.com' → 'example.com', 'https://www.example.com/' → 'example.com'
create or replace function public.domain_from_gsc_site_url(p_site_url text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(p_site_url, '^sc-domain:', ''),
          '^https?://', ''
        ),
        '/.*$', ''
      ),
      '^www\.', ''
    ),
    ''
  );
$$;

-- ─── backfill from connected_sources ─────────────────────────────────────────
-- For every user with legacy rows:
--   * the credential becomes one google_connections row (best row = has a
--     refresh token, most recently updated). No refresh token → the user is
--     asked to reconnect once; their properties survive.
--   * the first GA4 row + first GSC row become one active workspace; any
--     extra rows each get their own (inactive) workspace so nothing is lost.

do $$
declare
  u record;
  best record;
  r record;
  first_client uuid;
  target uuid;
  legacy_scopes text[] := array[
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/webmasters.readonly'
  ];
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'connected_sources'
  ) then
    return;
  end if;

  for u in
    select distinct user_id from public.connected_sources
    where source in ('ga4', 'gsc')
  loop
    -- credential
    if not exists (select 1 from public.google_connections where user_id = u.user_id) then
      select access_token, refresh_token, token_expires_at
        into best
        from public.connected_sources
       where user_id = u.user_id and source in ('ga4', 'gsc')
         and access_token is not null and access_token <> ''
       order by (refresh_token is not null and refresh_token <> '') desc, updated_at desc
       limit 1;

      if found then
        insert into public.google_connections
          (user_id, access_token, refresh_token, token_expires_at, scopes, status, status_reason, connected_at)
        values (
          u.user_id,
          best.access_token,
          nullif(best.refresh_token, ''),
          best.token_expires_at,
          legacy_scopes,
          case when nullif(best.refresh_token, '') is null then 'reconnect_required' else 'active' end,
          case when nullif(best.refresh_token, '') is null then 'missing_refresh_token' else null end,
          now()
        );
      end if;
    end if;

    -- workspaces
    if exists (select 1 from public.clients where user_id = u.user_id) then
      continue;
    end if;

    first_client := null;

    -- pass 1: GA4 rows
    for r in
      select * from public.connected_sources
       where user_id = u.user_id and source = 'ga4' and property_id <> '_pending'
       order by created_at
    loop
      insert into public.clients (user_id, name, domain, is_active)
      values (
        u.user_id,
        public.clean_legacy_property_name(coalesce(nullif(btrim(r.display_name), ''), r.property_id)),
        null,
        first_client is null
      )
      returning id into target;

      if first_client is null then
        first_client := target;
      end if;

      insert into public.client_sources (client_id, user_id, source, property_id, display_name)
      values (target, u.user_id, 'ga4', r.property_id, r.display_name)
      on conflict (client_id, source) do nothing;
    end loop;

    -- pass 2: GSC rows
    for r in
      select * from public.connected_sources
       where user_id = u.user_id and source = 'gsc' and property_id <> '_pending'
       order by created_at
    loop
      if first_client is not null and not exists (
        select 1 from public.client_sources where client_id = first_client and source = 'gsc'
      ) then
        target := first_client;
      else
        insert into public.clients (user_id, name, domain, is_active)
        values (
          u.user_id,
          public.clean_legacy_property_name(coalesce(nullif(btrim(r.display_name), ''), r.property_id)),
          null,
          first_client is null
        )
        returning id into target;

        if first_client is null then
          first_client := target;
        end if;
      end if;

      insert into public.client_sources (client_id, user_id, source, property_id, display_name)
      values (target, u.user_id, 'gsc', r.property_id, r.display_name)
      on conflict (client_id, source) do nothing;

      update public.clients
         set domain = coalesce(domain, public.domain_from_gsc_site_url(r.property_id))
       where id = target;
    end loop;
  end loop;
end;
$$;
