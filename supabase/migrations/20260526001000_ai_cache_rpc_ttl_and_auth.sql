-- Patch claim_ai_insights_generation:
--   1. Add 24h TTL check to the "done" cache hit case (previously cached forever).
--   2. Add auth.uid() = p_user_id guard so authenticated users cannot claim/update
--      another user's cache row even though the function is security definer.
--   3. Set search_path to prevent search_path hijacking.

create or replace function claim_ai_insights_generation(
  p_user_id        uuid,
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
  -- Auth guard: callers may only act on their own cache rows.
  if auth.uid() is distinct from p_user_id then
    raise exception 'unauthorized'
      using errcode = 'insufficient_privilege';
  end if;

  -- Lock the row if it exists (FOR UPDATE prevents concurrent races).
  select * into v_row
  from ai_report_cache
  where user_id      = p_user_id
    and period_start = p_period_start
    and period_end   = p_period_end
  for update;

  -- Case 1: no row yet → insert pending lease and claim generation.
  if not found then
    insert into ai_report_cache (
      user_id, period_start, period_end,
      metrics_hash, generation_status, generation_expires_at,
      generated_at, insights
    ) values (
      p_user_id, p_period_start, p_period_end,
      p_metrics_hash, 'pending', v_expires_at,
      now(), '{}'::jsonb
    );
    return jsonb_build_object('claimed', true, 'cached', false);
  end if;

  -- Case 2: done + hash matches + within 24h TTL → fresh cache hit.
  if v_row.generation_status = 'done'
     and v_row.metrics_hash = p_metrics_hash
     and v_row.generated_at > now() - interval '24 hours' then
    return jsonb_build_object('claimed', false, 'cached', true);
  end if;

  -- Case 3: pending + lease still valid → another request owns it, caller waits.
  if v_row.generation_status = 'pending'
     and v_row.generation_expires_at is not null
     and v_row.generation_expires_at > now() then
    return jsonb_build_object('claimed', false, 'cached', false);
  end if;

  -- Case 4: stale hash, expired TTL, expired pending lease, or failed → claim.
  update ai_report_cache set
    metrics_hash          = p_metrics_hash,
    generation_status     = 'pending',
    generation_expires_at = v_expires_at,
    generated_at          = now(),
    insights              = '{}'::jsonb
  where user_id      = p_user_id
    and period_start = p_period_start
    and period_end   = p_period_end;

  return jsonb_build_object('claimed', true, 'cached', false);
end;
$$;

-- Re-grant after replace (CREATE OR REPLACE resets grants in some PG versions).
grant execute on function claim_ai_insights_generation(uuid, date, date, text, int)
  to authenticated, service_role;
