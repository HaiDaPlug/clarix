-- Change unique constraint from (user_id, source) to (user_id, source, property_id).
-- This lets the _pending sentinel row coexist with real property rows so that
-- re-signing in with Google does not overwrite an already-connected property.

alter table public.connected_sources
  drop constraint connected_sources_user_id_source_key;

alter table public.connected_sources
  add constraint connected_sources_user_id_source_property_key
  unique (user_id, source, property_id);
