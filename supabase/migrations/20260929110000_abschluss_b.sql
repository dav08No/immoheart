-- Abschluss B: atomare Übergangsfunktionen (Spec §1/§4). Getrennt von Migration A, weil
-- Postgres neue Enum-Werte nicht in derselben Transaktion verwenden lässt.
-- security invoker: die RLS-Policies "aktives konto …" bleiben die einzige Zugriffsregel.
-- Sperrreihenfolge: Treffer-Funktionen sperren zuerst den Treffer, dann das Objekt;
-- Objekt-Funktionen zuerst das Objekt, dann die Treffer nach id.
-- #variable_conflict use_column: die OUT-Spalten objekt_id/anfrage_id heissen wie die
-- Tabellenspalten; ohne die Direktive wären Spaltenbezüge in plpgsql mehrdeutig.

create function treffer_reservieren(p_match uuid)
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
  delete from matches x where x.objekt_id = o.id and x.status = 'neu';
  return query select o.id, m.anfrage_id, array[]::uuid[];
end $$;

create function treffer_vermitteln(p_match uuid)
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
  delete from matches x
  where (x.objekt_id = o.id or x.anfrage_id = m.anfrage_id) and x.status = 'neu';
  return query select o.id, m.anfrage_id, v_erledigt;
end $$;

create function reservierung_aufheben(p_match uuid)
returns table (objekt_id uuid, anfrage_id uuid, erledigte_treffer uuid[])
language plpgsql security invoker set search_path = public, pg_temp as $$
#variable_conflict use_column
declare m matches%rowtype; o objekte%rowtype;
begin
  select * into m from matches where id = p_match for update;
  if not found then raise exception 'Treffer nicht gefunden.'; end if;
  if m.status <> 'reserviert' then raise exception 'Nur reservierte Treffer können aufgehoben werden.'; end if;
  select * into o from objekte where id = m.objekt_id for update;
  if o.status <> 'reserviert' then raise exception 'Das Objekt ist nicht reserviert.'; end if;

  update objekte set status = 'verfuegbar' where id = o.id;
  update matches set status = 'gesendet', reserviert_am = null where id = m.id;
  -- Rematching für das Objekt übernimmt die App.
  return query select o.id, m.anfrage_id, array[]::uuid[];
end $$;

create function treffer_ablehnen(p_match uuid)
returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare m matches%rowtype;
begin
  select * into m from matches where id = p_match for update;
  if not found then raise exception 'Treffer nicht gefunden.'; end if;
  if m.status <> 'gesendet' then raise exception 'Nur angebotene Treffer können abgelehnt werden.'; end if;
  update matches set status = 'abgelehnt' where id = m.id;
end $$;

create function objekt_nicht_verfuegbar(p_objekt uuid)
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
  delete from matches x where x.objekt_id = o.id and x.status = 'neu';
  -- Keine einzelne Anfrage betroffen, daher anfrage_id null.
  return query select o.id, null::uuid, v_erledigt;
end $$;

create function objekt_wieder_verfuegbar(p_objekt uuid)
returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare o objekte%rowtype;
begin
  select * into o from objekte where id = p_objekt for update;
  if not found then raise exception 'Objekt nicht gefunden.'; end if;
  if o.status not in ('reserviert', 'vermietet') then raise exception 'Das Objekt ist bereits verfügbar.'; end if;
  perform 1 from matches x where x.objekt_id = o.id order by x.id for update;

  update objekte set status = 'verfuegbar' where id = o.id;
  -- Wie Aufheben; vermittelte Treffer und Anfragen bleiben als Historie unverändert.
  update matches x set status = 'gesendet', reserviert_am = null
  where x.objekt_id = o.id and x.status = 'reserviert';
end $$;

revoke execute on function treffer_reservieren(uuid) from public, anon;
revoke execute on function treffer_vermitteln(uuid) from public, anon;
revoke execute on function reservierung_aufheben(uuid) from public, anon;
revoke execute on function treffer_ablehnen(uuid) from public, anon;
revoke execute on function objekt_nicht_verfuegbar(uuid) from public, anon;
revoke execute on function objekt_wieder_verfuegbar(uuid) from public, anon;
grant execute on function treffer_reservieren(uuid) to authenticated;
grant execute on function treffer_vermitteln(uuid) to authenticated;
grant execute on function reservierung_aufheben(uuid) to authenticated;
grant execute on function treffer_ablehnen(uuid) to authenticated;
grant execute on function objekt_nicht_verfuegbar(uuid) to authenticated;
grant execute on function objekt_wieder_verfuegbar(uuid) to authenticated;
