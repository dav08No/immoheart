-- Archiv F1 (Spec §1 "Archiv" und "Endgültig löschen"): Rapportpflicht, darum werden
-- Treffer, Objekte und Anfragen archiviert statt gelöscht. Nur additiv, weil Preview und
-- Produktion sich die DB teilen; die Lösch-Sperre auf objekte/anfragen kommt erst mit F2
-- nach dem Produktions-Deploy. Keine neuen Enum-Werte, daher eine Transaktion.

-- ---------------------------------------------------------------------------------------
-- Treffer-Archiv
-- ---------------------------------------------------------------------------------------

-- Bewusst ohne Fremdschlüssel: Der Trigger schreibt auch bei kaskadierenden Löschungen
-- (z. B. Rollback einer Anfrage), wo die Elternzeile im selben Statement schon weg ist;
-- ein FK-Check am Statement-Ende würde dann scheitern.
create table treffer_archiv (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  anfrage_id uuid not null,
  objekt_id uuid not null,
  status match_status_enum not null,
  score smallint not null,
  kriterien jsonb not null,
  hinweis text not null,
  angeboten_am timestamptz,
  reserviert_am timestamptz,
  abgeschlossen_am timestamptz,
  treffer_erstellt_am timestamptz not null,
  archiviert_am timestamptz not null default now(),
  grund text not null
);
create index treffer_archiv_archiviert_am on treffer_archiv (archiviert_am);
create index treffer_archiv_anfrage on treffer_archiv (anfrage_id);
create index treffer_archiv_objekt on treffer_archiv (objekt_id);

alter table treffer_archiv enable row level security;
-- Nur Lesen per Policy; Schreiben geht ausschliesslich über Trigger und Funktionen.
create policy "aktives konto liest treffer_archiv" on treffer_archiv for select to authenticated
  using (ist_aktives_konto());
revoke all on table treffer_archiv from anon;
-- TRUNCATE umgeht RLS; Supabase vergibt per Default alle Tabellenrechte an authenticated.
revoke insert, update, delete, truncate, references, trigger on table treffer_archiv from authenticated;

-- security definer, weil RLS auf treffer_archiv kein Insert erlaubt. Der Grund kommt aus der
-- transaktionslokalen Einstellung, die die Funktionen vor ihrem delete setzen.
create function archiviere_treffer() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- Endgültiges Löschen: die Treffer sollen spurlos verschwinden.
  if current_setting('immoheart.endgueltig', true) = '1' then
    return old;
  end if;
  insert into treffer_archiv (
    match_id, anfrage_id, objekt_id, status, score, kriterien, hinweis,
    angeboten_am, reserviert_am, abgeschlossen_am, treffer_erstellt_am, grund
  ) values (
    old.id, old.anfrage_id, old.objekt_id, old.status, old.score, old.kriterien, old.hinweis,
    old.angeboten_am, old.reserviert_am, old.abgeschlossen_am, old.created_at,
    coalesce(nullif(current_setting('immoheart.archiv_grund', true), ''), 'unbekannt')
  );
  return old;
end $$;
-- Nur der Trigger ruft sie auf; Ausführungsrecht braucht beim Feuern niemand.
revoke execute on function archiviere_treffer() from public, anon, authenticated;

create trigger matches_archivieren before delete on matches
  for each row execute function archiviere_treffer();

-- ---------------------------------------------------------------------------------------
-- Archiv-Spalten auf Objekten und Anfragen
-- ---------------------------------------------------------------------------------------

alter table objekte
  add column if not exists archiviert_am timestamptz,
  add column if not exists archiv_grund text;
alter table anfragen
  add column if not exists archiviert_am timestamptz,
  add column if not exists archiv_grund text;
create index if not exists objekte_archiviert_am on objekte (archiviert_am);
create index if not exists anfragen_archiviert_am on anfragen (archiviert_am);
-- anon braucht Leserecht auf archiviert_am, weil View (security_invoker) und Foto-Policy die
-- Spalte mit anon-Rechten auswerten; sonst "permission denied" auf der Website. Verrät
-- nichts: die anon-Policy unten liefert nur Zeilen mit archiviert_am null. archiv_grund bleibt intern.
grant select (archiviert_am) on table objekte to anon;

-- Wie n5, nur zusätzlich ohne archivierte Objekte. Spalten unverändert (keine Umordnung).
create or replace view objekte_oeffentlich with (security_invoker = true) as
  select id, titel, ort, flaeche, preis_pro_m2, nutzung, eigenschaften, verfuegbar_ab, status, created_at, beschreibung
  from objekte
  where oeffentlich and status in ('verfuegbar', 'reserviert') and archiviert_am is null;
grant select on objekte_oeffentlich to anon, authenticated;

-- Archivierte Objekte und ihre Fotos auch bei direktem anon-Zugriff per id verbergen.
drop policy "oeffentlich liest gelistete objekte" on objekte;
create policy "oeffentlich liest gelistete objekte" on objekte for select to anon
  using (oeffentlich and status in ('verfuegbar', 'reserviert') and archiviert_am is null);
drop policy "oeffentlich liest fotos gelisteter objekte" on objekt_fotos;
create policy "oeffentlich liest fotos gelisteter objekte" on objekt_fotos for select to anon
  using (exists (select 1 from objekte o where o.id = objekt_fotos.objekt_id and o.archiviert_am is null));

-- ---------------------------------------------------------------------------------------
-- Treffer entfernen (App) und Abschluss-Funktionen mit Grund
-- ---------------------------------------------------------------------------------------

-- Löschungen aus der App (Rematching, manueller Status) laufen hierüber, damit der Grund
-- im Archiv steht.
create function treffer_entfernen(p_ids uuid[], p_grund text)
returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  -- Leerer Grund wird im Trigger zu 'unbekannt'; null würde set_config nicht sauber setzen.
  perform set_config('immoheart.archiv_grund', coalesce(p_grund, ''), true);
  delete from matches x where x.id = any(p_ids);
end $$;

-- Rümpfe identisch zu Abschluss B, nur mit Archiv-Grund vor jedem delete.
create or replace function treffer_reservieren(p_match uuid)
returns table (objekt_id uuid, anfrage_id uuid, erledigte_treffer uuid[])
language plpgsql security invoker set search_path = public, pg_temp as $$
#variable_conflict use_column
declare m matches%rowtype; o objekte%rowtype;
begin
  select * into m from matches where id = p_match for update;
  if not found then raise exception 'Treffer nicht gefunden.'; end if;
  if m.status <> 'gesendet' then raise exception 'Nur angebotene Treffer können reserviert werden.'; end if;
  select * into o from objekte where id = m.objekt_id for update;
  if o.status <> 'verfuegbar' then raise exception 'Das Objekt ist nicht mehr verfügbar.'; end if;

  update objekte set status = 'reserviert' where id = o.id;
  update matches set status = 'reserviert', reserviert_am = now() where id = m.id;
  -- Andere angebotene Treffer bleiben 'gesendet': Absagen erst bei Vertragsabschluss.
  perform set_config('immoheart.archiv_grund', 'Objekt reserviert', true);
  delete from matches x where x.objekt_id = o.id and x.status = 'neu';
  return query select o.id, m.anfrage_id, array[]::uuid[];
end $$;

create or replace function treffer_vermitteln(p_match uuid)
returns table (objekt_id uuid, anfrage_id uuid, erledigte_treffer uuid[])
language plpgsql security invoker set search_path = public, pg_temp as $$
#variable_conflict use_column
declare m matches%rowtype; o objekte%rowtype; v_erledigt uuid[];
begin
  select * into m from matches where id = p_match for update;
  if not found then raise exception 'Treffer nicht gefunden.'; end if;
  if m.status <> 'reserviert' then raise exception 'Nur reservierte Treffer können vermittelt werden.'; end if;
  select * into o from objekte where id = m.objekt_id for update;
  if o.status <> 'reserviert' then raise exception 'Das Objekt ist nicht reserviert.'; end if;

  update objekte set status = 'vermietet' where id = o.id;
  update matches set status = 'vermittelt', abgeschlossen_am = now() where id = m.id;
  update anfragen set status = 'vermittelt' where id = m.anfrage_id;
  -- Nur die anderen Angebote desselben Objekts bekommen eine Absage (Rückgabe).
  with erledigt as (
    update matches x set status = 'erledigt'
    where x.objekt_id = o.id and x.status = 'gesendet' and x.id <> m.id
    returning x.id
  ) select coalesce(array_agg(e.id order by e.id), array[]::uuid[]) into v_erledigt from erledigt e;
  -- Übrige Angebote der Anfrage: die Firma hat abgeschlossen, keine Absage nötig.
  update matches x set status = 'erledigt'
  where x.anfrage_id = m.anfrage_id and x.status = 'gesendet' and x.id <> m.id;
  -- Ein Grund für beide Seiten (Objekt und Anfrage) dieser Vermittlung.
  perform set_config('immoheart.archiv_grund', 'Anfrage vermittelt', true);
  delete from matches x
  where (x.objekt_id = o.id or x.anfrage_id = m.anfrage_id) and x.status = 'neu';
  return query select o.id, m.anfrage_id, v_erledigt;
end $$;

create or replace function objekt_nicht_verfuegbar(p_objekt uuid)
returns table (objekt_id uuid, anfrage_id uuid, erledigte_treffer uuid[])
language plpgsql security invoker set search_path = public, pg_temp as $$
#variable_conflict use_column
declare o objekte%rowtype; v_erledigt uuid[];
begin
  select * into o from objekte where id = p_objekt for update;
  if not found then raise exception 'Objekt nicht gefunden.'; end if;
  if o.status not in ('verfuegbar', 'reserviert') then raise exception 'Das Objekt ist bereits vermietet.'; end if;
  perform 1 from matches x where x.objekt_id = o.id order by x.id for update;

  update objekte set status = 'vermietet' where id = o.id;
  -- Alle Firmen mit Angebot oder Reservierung erhalten eine Absage (Rückgabe).
  with erledigt as (
    update matches x set status = 'erledigt'
    where x.objekt_id = o.id and x.status in ('gesendet', 'reserviert')
    returning x.id
  ) select coalesce(array_agg(e.id order by e.id), array[]::uuid[]) into v_erledigt from erledigt e;
  perform set_config('immoheart.archiv_grund', 'Objekt nicht mehr verfügbar', true);
  delete from matches x where x.objekt_id = o.id and x.status = 'neu';
  -- Keine einzelne Anfrage betroffen, daher anfrage_id null.
  return query select o.id, null::uuid, v_erledigt;
end $$;

-- ---------------------------------------------------------------------------------------
-- Archivieren und Wiederherstellen
-- ---------------------------------------------------------------------------------------

create function objekt_archivieren(p_id uuid, p_grund text)
returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare o objekte%rowtype;
begin
  select * into o from objekte where id = p_id for update;
  if not found then raise exception 'Objekt nicht gefunden.'; end if;
  if o.archiviert_am is not null then raise exception 'Das Objekt ist bereits archiviert.'; end if;
  perform 1 from matches x where x.objekt_id = o.id order by x.id for update;
  -- Offene Angebote zuerst abschliessen, damit die Firmen ihre Absage bekommen.
  if exists (select 1 from matches x where x.objekt_id = o.id and x.status in ('gesendet', 'reserviert')) then
    raise exception 'Zuerst Angebote abschliessen (z. B. ‚Nicht mehr verfügbar‘).';
  end if;

  perform set_config('immoheart.archiv_grund', 'Objekt archiviert', true);
  delete from matches x where x.objekt_id = o.id and x.status = 'neu';
  update objekte set archiviert_am = now(), archiv_grund = nullif(trim(p_grund), '') where id = o.id;
end $$;

create function anfrage_archivieren(p_id uuid, p_grund text)
returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare a anfragen%rowtype;
begin
  select * into a from anfragen where id = p_id for update;
  if not found then raise exception 'Anfrage nicht gefunden.'; end if;
  if a.archiviert_am is not null then raise exception 'Die Anfrage ist bereits archiviert.'; end if;
  perform 1 from matches x where x.anfrage_id = a.id order by x.id for update;
  if exists (select 1 from matches x where x.anfrage_id = a.id and x.status = 'reserviert') then
    raise exception 'Zuerst die Reservierung aufheben oder abschliessen.';
  end if;

  -- Die Firma sucht nicht mehr: offene Angebote ohne Absage erledigen.
  update matches x set status = 'erledigt' where x.anfrage_id = a.id and x.status = 'gesendet';
  perform set_config('immoheart.archiv_grund', 'Anfrage archiviert', true);
  delete from matches x where x.anfrage_id = a.id and x.status = 'neu';
  update anfragen set archiviert_am = now(), archiv_grund = nullif(trim(p_grund), '') where id = a.id;
end $$;

-- Status und Daten bleiben wie beim Archivieren; das Rematching übernimmt die App.
create function objekt_wiederherstellen(p_id uuid)
returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare o objekte%rowtype;
begin
  select * into o from objekte where id = p_id for update;
  if not found then raise exception 'Objekt nicht gefunden.'; end if;
  if o.archiviert_am is null then raise exception 'Das Objekt ist nicht archiviert.'; end if;
  update objekte set archiviert_am = null, archiv_grund = null where id = o.id;
end $$;

create function anfrage_wiederherstellen(p_id uuid)
returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare a anfragen%rowtype;
begin
  select * into a from anfragen where id = p_id for update;
  if not found then raise exception 'Anfrage nicht gefunden.'; end if;
  if a.archiviert_am is null then raise exception 'Die Anfrage ist nicht archiviert.'; end if;
  update anfragen set archiviert_am = null, archiv_grund = null where id = a.id;
end $$;

-- ---------------------------------------------------------------------------------------
-- Endgültig löschen (nur Administratoren, nur archivierte Daten, ohne Protokoll)
-- ---------------------------------------------------------------------------------------

-- security definer, damit die Prüfung nicht von der profiles-RLS abhängt (wie ist_aktives_konto).
create function ist_admin() returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (select 1 from profiles where user_id = auth.uid() and darf_nutzer_anlegen and aktiv)
$$;

-- Die drei Löschfunktionen sind security definer: treffer_archiv hat bewusst keine
-- Delete-Policy, und eine separate Definer-Hilfsfunktion bräuchte dieselbe Admin-Prüfung.
-- Darum prüfen sie ist_admin() als allererstes und arbeiten nur mit der übergebenen id.
create function archiv_eintrag_loeschen(p_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not ist_admin() then raise exception 'Nur Administratoren dürfen endgültig löschen.'; end if;
  delete from treffer_archiv t where t.id = p_id;
  if not found then raise exception 'Archiveintrag nicht gefunden.'; end if;
end $$;

create function objekt_endgueltig_loeschen(p_id uuid)
returns table (foto_pfade text[])
language plpgsql security definer set search_path = public, pg_temp as $$
declare o objekte%rowtype; v_pfade text[];
begin
  if not ist_admin() then raise exception 'Nur Administratoren dürfen endgültig löschen.'; end if;
  select * into o from objekte where id = p_id for update;
  if not found then raise exception 'Objekt nicht gefunden.'; end if;
  if o.archiviert_am is null then raise exception 'Nur archivierte Objekte können endgültig gelöscht werden.'; end if;

  -- Archiv-Trigger überspringen (Treffer sollen nicht ins Archiv) und F2-Sperre freigeben.
  perform set_config('immoheart.endgueltig', '1', true);
  -- Pfade vor der Kaskade sammeln; die Dateien im Storage löscht danach die App.
  select coalesce(array_agg(f.pfad order by f.reihenfolge, f.id), array[]::text[]) into v_pfade
  from objekt_fotos f where f.objekt_id = o.id;
  delete from treffer_archiv t where t.objekt_id = o.id;
  -- Kaskade auf matches und objekt_fotos; anfragen/nachrichten.objekt_id werden null.
  delete from objekte where id = o.id;
  return query select v_pfade;
end $$;

create function anfrage_endgueltig_loeschen(p_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare a anfragen%rowtype;
begin
  if not ist_admin() then raise exception 'Nur Administratoren dürfen endgültig löschen.'; end if;
  select * into a from anfragen where id = p_id for update;
  if not found then raise exception 'Anfrage nicht gefunden.'; end if;
  if a.archiviert_am is null then raise exception 'Nur archivierte Anfragen können endgültig gelöscht werden.'; end if;

  perform set_config('immoheart.endgueltig', '1', true);
  delete from treffer_archiv t where t.anfrage_id = a.id;
  -- Kaskade auf matches; nachrichten.anfrage_id wird null, die Firma bleibt.
  delete from anfragen where id = a.id;
end $$;

-- ---------------------------------------------------------------------------------------
-- Rollback einer Doppelklick-Dublette (einzige erlaubte Anfrage-Löschung neben dem
-- endgültigen Löschen; die Sperre selbst kommt mit F2)
-- ---------------------------------------------------------------------------------------

create function anfrage_rollback(p_id uuid)
returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare a anfragen%rowtype;
begin
  select * into a from anfragen where id = p_id for update;
  if not found then raise exception 'Anfrage nicht gefunden.'; end if;
  -- Nur frisch angelegte, noch nirgends verknüpfte Anfragen: sonst ginge Rapport-Historie verloren.
  if a.created_at < now() - interval '10 minutes' then
    raise exception 'Nur gerade erst angelegte Anfragen können zurückgerollt werden.';
  end if;
  if exists (select 1 from nachrichten n where n.anfrage_id = a.id) then
    raise exception 'Die Anfrage hat bereits Nachrichten und kann nicht zurückgerollt werden.';
  end if;

  perform set_config('immoheart.rollback', '1', true);
  perform set_config('immoheart.archiv_grund', 'Rollback Dublette', true);
  delete from anfragen where id = a.id;
end $$;

-- ---------------------------------------------------------------------------------------
-- Rechte
-- ---------------------------------------------------------------------------------------

revoke execute on function treffer_entfernen(uuid[], text) from public, anon;
revoke execute on function treffer_reservieren(uuid) from public, anon;
revoke execute on function treffer_vermitteln(uuid) from public, anon;
revoke execute on function objekt_nicht_verfuegbar(uuid) from public, anon;
revoke execute on function objekt_archivieren(uuid, text) from public, anon;
revoke execute on function anfrage_archivieren(uuid, text) from public, anon;
revoke execute on function objekt_wiederherstellen(uuid) from public, anon;
revoke execute on function anfrage_wiederherstellen(uuid) from public, anon;
revoke execute on function ist_admin() from public, anon;
revoke execute on function archiv_eintrag_loeschen(uuid) from public, anon;
revoke execute on function objekt_endgueltig_loeschen(uuid) from public, anon;
revoke execute on function anfrage_endgueltig_loeschen(uuid) from public, anon;
revoke execute on function anfrage_rollback(uuid) from public, anon;
grant execute on function treffer_entfernen(uuid[], text) to authenticated;
grant execute on function treffer_reservieren(uuid) to authenticated;
grant execute on function treffer_vermitteln(uuid) to authenticated;
grant execute on function objekt_nicht_verfuegbar(uuid) to authenticated;
grant execute on function objekt_archivieren(uuid, text) to authenticated;
grant execute on function anfrage_archivieren(uuid, text) to authenticated;
grant execute on function objekt_wiederherstellen(uuid) to authenticated;
grant execute on function anfrage_wiederherstellen(uuid) to authenticated;
grant execute on function ist_admin() to authenticated;
grant execute on function archiv_eintrag_loeschen(uuid) to authenticated;
grant execute on function objekt_endgueltig_loeschen(uuid) to authenticated;
grant execute on function anfrage_endgueltig_loeschen(uuid) to authenticated;
grant execute on function anfrage_rollback(uuid) to authenticated;
