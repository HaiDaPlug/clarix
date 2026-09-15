-- AI insights are generated from one workspace's numbers, so the cache row
-- must be keyed by that workspace too. Before this, two customers sharing a
-- period thrashed one cache row and a race could serve the wrong copy.

alter table public.ai_report_cache
  add column if not exists client_id uuid references public.clients(id) on delete cascade;

-- Existing rows were generated for whichever properties the user had at the
-- time; the migration above made those the user's active workspace.
update public.ai_report_cache c
   set client_id = cl.id
  from public.clients cl
 where cl.user_id = c.user_id
   and cl.is_active
   and c.client_id is null;

-- A cache row with no workspace is disposable (regenerated on next load).
delete from public.ai_report_cache where client_id is null;

alter table public.ai_report_cache
  alter column client_id set not null;

-- Replace the (user, period) uniqueness with (user, client, period). The old
-- constraint name depends on how the table was created, so look it up.
do $$
declare
  v_name text;
begin
  for v_name in
    select conname
      from pg_constraint
     where conrelid = 'public.ai_report_cache'::regclass
       and contype = 'u'
       and conname <> 'ai_report_cache_user_client_period_key'
  loop
    execute format('alter table public.ai_report_cache drop constraint %I', v_name);
  end loop;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.ai_report_cache'::regclass
       and conname = 'ai_report_cache_user_client_period_key'
  ) then
    alter table public.ai_report_cache
      add constraint ai_report_cache_user_client_period_key
      unique (user_id, client_id, period_start, period_end);
  end if;
end;
$$;

drop index if exists public.ai_report_cache_user_period;
create index if not exists ai_report_cache_user_client_period
  on public.ai_report_cache (user_id, client_id, period_start, period_end);

-- ─── claim_ai_insights_generation (now workspace-scoped) ─────────────────────

drop function if exists public.claim_ai_insights_generation(uuid, date, date, text, int);

create or replace function public.claim_ai_insights_generation(
  p_user_id        uuid,
  p_client_id      uuid,
  p_period_start   date,
  p_period_end     date,
  p_metrics_hash   text,
  p_lease_seconds  int default 60
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row         ai_report_cache%rowtype;
  v_expires_at  timestamptz := now() + (p_lease_seconds || ' seconds')::interval;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'unauthorized' using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.clients where id = p_client_id and user_id = p_user_id
  ) then
    raise exception 'client not found' using errcode = 'no_data_found';
  end if;

  select * into v_row
    from ai_report_cache
   where user_id      = p_user_id
     and client_id    = p_client_id
     and period_start = p_period_start
     and period_end   = p_period_end
   for update;

  if not found then
    insert into ai_report_cache (
      user_id, client_id, period_start, period_end,
      metrics_hash, generation_status, generation_expires_at,
      generated_at, insights
    ) values (
      p_user_id, p_client_id, p_period_start, p_period_end,
      p_metrics_hash, 'pending', v_expires_at,
      now(), '{}'::jsonb
    );
    return jsonb_build_object('claimed', true, 'cached', false);
  end if;

  if v_row.generation_status = 'done'
     and v_row.metrics_hash = p_metrics_hash
     and v_row.generated_at > now() - interval '24 hours' then
    return jsonb_build_object('claimed', false, 'cached', true);
  end if;

  if v_row.generation_status = 'pending'
     and v_row.generation_expires_at is not null
     and v_row.generation_expires_at > now() then
    return jsonb_build_object('claimed', false, 'cached', false);
  end if;

  update ai_report_cache set
    metrics_hash          = p_metrics_hash,
    generation_status     = 'pending',
    generation_expires_at = v_expires_at,
    generated_at          = now(),
    insights              = '{}'::jsonb
  where user_id      = p_user_id
    and client_id    = p_client_id
    and period_start = p_period_start
    and period_end   = p_period_end;

  return jsonb_build_object('claimed', true, 'cached', false);
end;
$$;

grant execute on function public.claim_ai_insights_generation(uuid, uuid, date, date, text, int)
  to authenticated, service_role;
