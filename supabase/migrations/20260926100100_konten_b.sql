-- Relaunch N1, Teil B: Altlasten entfernen. Erst einspielen, wenn der Code aus
-- feature/n1-fundament auf Production läuft (siehe Plan N1, Task 11).

-- Alle Policies aus dem alten Rollenmodell entfernen, die neuen "aktives konto"-
-- und "oeffentlich"-Policies aus Teil A bleiben.
do $$
declare r record;
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and policyname not like 'aktives konto %'
      and policyname not like 'oeffentlich %'
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

drop view if exists anfragen_sichtbar;
drop table if exists regeln;

alter table anfragen drop column if exists vertraulich;

alter table profiles drop constraint if exists profiles_freigabe_stufe_range;
alter table profiles drop column if exists freigabe_stufe;
drop function if exists current_rolle();
alter table profiles drop column if exists rolle;
drop type if exists rolle_enum;

delete from auth.users where email = 'test@immoheart.com';
