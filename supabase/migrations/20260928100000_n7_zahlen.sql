-- Relaunch N7: belegter Speicher für die Kennzahlen-Seite.
create function speicher_belegt() returns table (bucket text, bytes bigint)
language sql security definer stable set search_path = storage, public, pg_temp as $$
  select bucket_id::text, coalesce(sum((metadata->>'size')::bigint), 0)::bigint
  from storage.objects group by bucket_id
$$;
revoke execute on function speicher_belegt() from public, anon, authenticated;
grant execute on function speicher_belegt() to service_role;
