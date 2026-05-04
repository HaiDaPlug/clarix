-- Idempotent repair for environments where the original property-key migration
-- was already recorded before the three-column constraint was verified.

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.connected_sources'::regclass
      and conname = 'connected_sources_user_id_source_key'
  ) then
    alter table public.connected_sources
      drop constraint connected_sources_user_id_source_key;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.connected_sources'::regclass
      and conname = 'connected_sources_user_id_source_property_key'
  ) then
    alter table public.connected_sources
      add constraint connected_sources_user_id_source_property_key
      unique (user_id, source, property_id);
  end if;
end $$;
