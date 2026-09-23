-- Profil-Trigger: legt automatisch eine profiles-Zeile fuer jeden neuen
-- auth.users-Eintrag an (Standardrolle 'leser', Standard-Freigabestufe 1).
--
-- Sicherheitshinweis (M1-Lektion, siehe 20260923033041_rls_fix_base_table_read.sql):
-- handle_new_user() ist SECURITY DEFINER. Ohne festen search_path wuerde die
-- Funktion mit dem search_path der aufrufenden Session laufen. Der INSERT ist
-- zwar bereits ueber "public.profiles" schema-qualifiziert, aber split_part(...)
-- ist ein unqualifizierter Funktionsaufruf, der ueber den search_path aufgeloest
-- wird. Ein fester search_path verhindert, dass ein Schema vor pg_catalog in der
-- Session dieses Funktion mit einer eigenen split_part-Definition kapert.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (user_id, name, rolle, freigabe_stufe)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'leser',
    1
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- handle_new_user() ist eine Trigger-Funktion (returns trigger) und kann von
-- Postgres ohnehin nicht direkt via SQL/RPC aufgerufen werden ("trigger
-- functions can only be called as triggers"). Der Supabase-Security-Advisor
-- meldet SECURITY-DEFINER-Funktionen trotzdem als ueber PostgREST erreichbar
-- (/rest/v1/rpc/handle_new_user), analog zu current_rolle() in
-- 20260923033041_rls_fix_base_table_read.sql. Postgres vergibt EXECUTE bei
-- create function standardmaessig an PUBLIC (nicht an einzelne Rollen) --
-- "revoke ... from anon, authenticated" allein greift daher nicht, weil anon
-- und authenticated nie einen individuellen Grant hatten, sondern nur ueber
-- ihre implizite PUBLIC-Mitgliedschaft zugreifen. Erst der Entzug von PUBLIC
-- selbst schliesst die exponierte RPC-Route (niemand ausser postgres/
-- service_role braucht diese Funktion direkt aufzurufen, sie laeuft nur ueber
-- den Trigger).
revoke execute on function handle_new_user() from public;
