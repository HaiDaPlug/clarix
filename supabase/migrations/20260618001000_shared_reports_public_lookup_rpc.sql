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
    and (sr.expires_at is null or sr.expires_at > now())
  limit 1;
$$;

revoke all on function public.get_shared_report_by_token_hash(text)
  from public;

grant execute on function public.get_shared_report_by_token_hash(text)
  to anon, authenticated;
