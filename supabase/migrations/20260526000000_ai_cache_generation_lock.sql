-- Add generation status lease columns to ai_report_cache.
-- generation_status: tracks whether a generation is in-flight, done, or failed.
-- generation_expires_at: lease expiry — a pending row older than this is considered
--   abandoned and can be reclaimed by the next request.

alter table ai_report_cache
  add column if not exists generation_status text not null default 'done'
    check (generation_status in ('pending', 'done', 'failed')),
  add column if not exists generation_expires_at timestamptz;

-- Backfill existing rows as done (they all have real insights already).
update ai_report_cache set generation_status = 'done' where generation_status = 'done';

-- ─── claim_ai_insights_generation ────────────────────────────────────────────
-- Atomically determines whether the calling request should run LLM generation.
--
-- Returns:
--   claimed  true  → caller owns generation; it must write results when done
--   claimed  false → another request is actively generating; caller should wait
--   cached   true  → fresh done row exists; caller should read from cache
--
-- Claim logic (all in one serializable update, no race window):
--   1. If no row exists → insert a pending lease row, claim = true
--   2. If row exists and is done + fresh hash → cached = true, claim = false
--   3. If row exists and is pending + lease not expired → claim = false (wait)
--   4. All other cases (stale hash, expired lease, failed) → update to pending, claim = true

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
as $$
declare
  v_row         ai_report_cache%rowtype;
  v_expires_at  timestamptz := now() + (p_lease_seconds || ' seconds')::interval;
begin
  -- Lock the row if it exists (skip locked so concurrent callers don't pile up).
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

  -- Case 2: done + hash matches → fresh cache hit, nothing to do.
  if v_row.generation_status = 'done'
     and v_row.metrics_hash = p_metrics_hash then
    return jsonb_build_object('claimed', false, 'cached', true);
  end if;

  -- Case 3: pending + lease still valid → another request owns it, caller waits.
  if v_row.generation_status = 'pending'
     and v_row.generation_expires_at is not null
     and v_row.generation_expires_at > now() then
    return jsonb_build_object('claimed', false, 'cached', false);
  end if;

  -- Case 4: stale hash, expired pending, or failed → claim generation.
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

-- Grant execute to authenticated users (route runs as authed user via anon key)
-- and to service_role for any server-side usage.
grant execute on function claim_ai_insights_generation(uuid, date, date, text, int)
  to authenticated, service_role;
