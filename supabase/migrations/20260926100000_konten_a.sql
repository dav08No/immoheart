-- Relaunch N1, Teil A: neues Konto-Modell, rein ergänzend.
-- Teil B (20260926100100_konten_b.sql) entfernt die Altlasten erst, wenn der neue
-- Code auf Production läuft -- Preview und Production teilen diese Datenbank.

alter table profiles
  add column darf_nutzer_anlegen boolean not null default false,
  add column aktiv boolean not null default true;

create function ist_aktives_konto() returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (select 1 from profiles where user_id = auth.uid() and aktiv)
$$;
revoke execute on function ist_aktives_konto() from public, anon;
grant execute on function ist_aktives_konto() to authenticated;

create policy "aktives konto liest profile" on profiles for select to authenticated
  using (ist_aktives_konto());

create policy "aktives konto verwaltet firmen" on firmen for all to authenticated
  using (ist_aktives_konto()) with check (ist_aktives_konto());
create policy "aktives konto verwaltet anfragen" on anfragen for all to authenticated
  using (ist_aktives_konto()) with check (ist_aktives_konto());
create policy "aktives konto verwaltet objekte" on objekte for all to authenticated
  using (ist_aktives_konto()) with check (ist_aktives_konto());
create policy "aktives konto verwaltet matches" on matches for all to authenticated
  using (ist_aktives_konto()) with check (ist_aktives_konto());
create policy "aktives konto verwaltet nachrichten" on nachrichten for all to authenticated
  using (ist_aktives_konto()) with check (ist_aktives_konto());

-- Öffentliche Objektliste. Anonyme Besucher bekommen keine Tabellenrechte auf
-- objekte, sondern nur Spaltenrechte auf die freigegebenen Spalten plus eine
-- Zeilen-Policy. Adresse und Eigentümer sind damit auch per direkter API-Abfrage
-- nicht lesbar. Die View ist security_invoker, damit genau diese Rechte greifen
-- (keine security-definer-View, die RLS umginge).
revoke all on table objekte from anon;
grant select (id, titel, ort, flaeche, preis_pro_m2, nutzung, eigenschaften, verfuegbar_ab, status, created_at)
  on table objekte to anon;
create policy "oeffentlich liest gelistete objekte" on objekte for select to anon
  using (status in ('verfuegbar', 'reserviert'));

create view objekte_oeffentlich with (security_invoker = true) as
  select id, titel, ort, flaeche, preis_pro_m2, nutzung, eigenschaften, verfuegbar_ab, status, created_at
  from objekte
  where status in ('verfuegbar', 'reserviert');
grant select on objekte_oeffentlich to anon, authenticated;

-- Anonyme Besucher schreiben nie direkt in eine Tabelle (Formulare laufen ab N5
-- über Server Actions mit Service-Role-Key).
revoke insert, update, delete on all tables in schema public from anon;

-- Start-Konto. Auf einer frischen Datenbank ohne dieses Konto ist das ein No-op.
update profiles set darf_nutzer_anlegen = true
  where user_id = (select id from auth.users where email = 'vermittler@immoheart.com');
