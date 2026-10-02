-- Abschluss D (Davide-Entscheid I5, 2026-10-02): "Wieder verfügbar" macht Firmen, denen das
-- Objekt früher abgesagt wurde (Treffer 'erledigt'), wieder anbietbar -- aber nur, solange
-- ihre Anfrage noch offen ist. abgelehnt/verworfen/vermittelt bleiben unverändert (bewusste
-- Entscheidungen bzw. Historie). angeboten_am bleibt stehen: die Oberfläche zeigt daraus
-- "früher abgesagt am …" und die KI erwähnt das frühere Angebot.
create or replace function objekt_wieder_verfuegbar(p_objekt uuid)
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
  -- Früher abgesagte Firmen mit weiterhin offener Suche werden wieder neue Treffer.
  -- Ruling R16: deren alte, nie gesendete Angebots-Entwürfe werden weich gelöscht -- sonst
  -- gäbe matchSenden (Dedup R2) den veralteten Text zurück statt eines neuen, der das
  -- frühere Angebot erwähnt.
  with zurueck as (
    update matches x set status = 'neu'
    from anfragen a
    where x.objekt_id = o.id and x.status = 'erledigt' and a.id = x.anfrage_id and a.status = 'offen'
    returning x.id
  )
  update nachrichten n set geloescht_am = now()
  where n.match_id in (select id from zurueck)
    and n.richtung = 'entwurf' and n.typ = 'angebot'
    and n.gesendet_am is null and n.geloescht_am is null;
end $$;

revoke execute on function objekt_wieder_verfuegbar(uuid) from public, anon;
grant execute on function objekt_wieder_verfuegbar(uuid) to authenticated;
