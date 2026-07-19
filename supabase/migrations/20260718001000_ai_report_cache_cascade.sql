-- ai_report_cache's user_id FK was created without on delete cascade, so
-- leftover cache rows block deleting a user from auth.users. Recreate it with
-- cascade, matching connected_sources, shared_reports, and google_report_cache.

alter table ai_report_cache
  drop constraint if exists ai_report_cache_user_id_fkey;

alter table ai_report_cache
  add constraint ai_report_cache_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
