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
