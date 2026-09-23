-- Share-link lifecycle: owner-controlled revoke plus a real default expiry.
-- Closes items 1, 2 and 6 of "Deferred GDPR Follow-Ups" in docs/gdpr-report.md.
--
-- `expires_at` already existed, was indexed, and was already enforced by
-- get_shared_report_by_token_hash(). Nothing ever set it, so every link ever
-- created is permanent. This migration adds revocation and backfills a
-- default lifetime onto the existing rows.

-- Explicit revocation, kept separate from expiry so the owner can see WHY a
-- link stopped working. A revoked link is never resurrected by changing dates.
alter table public.shared_reports
  add column if not exists revoked_at timestamptz;

-- The label the owner gave the workspace when the link was made, so the
-- management view can list links without joining a workspace that may since
-- have been renamed or deleted.
alter table public.shared_reports
  add column if not exists workspace_label text;

-- Existing links are permanent. Give them the same 90-day lifetime new links
-- get, counted from creation, rather than expiring them instantly and
-- breaking links already sent to customers.
update public.shared_reports
   set expires_at = created_at + interval '90 days'
 where expires_at is null
   and revoked_at is null;

-- The public lookup must refuse revoked links as well as expired ones.
-- Returns the same empty result for every failure so a caller cannot tell a
-- revoked link from an expired or never-existing one.
create or replace function public.get_shared_report_by_token_hash(
  p_token_hash text
)
returns table (
  report_data jsonb,
  ai_insights jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sr.report_data,
    sr.ai_insights
  from public.shared_reports sr
  where p_token_hash ~ '^[a-f0-9]{64}$'
    and sr.share_token_hash = p_token_hash
    and sr.revoked_at is null
    and (sr.expires_at is null or sr.expires_at > now())
  limit 1;
$$;

revoke all on function public.get_shared_report_by_token_hash(text)
  from public;

grant execute on function public.get_shared_report_by_token_hash(text)
  to anon, authenticated;

-- Listing a user's own links is an indexed owner+created_at scan already
-- (shared_reports_owner_created_idx). Add a partial index for the common
-- "my links that still work" filter.
create index if not exists shared_reports_owner_live_idx
  on public.shared_reports (owner_user_id, created_at desc)
  where revoked_at is null;
