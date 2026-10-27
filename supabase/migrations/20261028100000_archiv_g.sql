-- Archiv G (Final-Review C1/I1, Ruling R9). Nur additiv, weil Preview und Produktion
-- sich die DB teilen.

-- Angebots-Mails trugen bisher nur anfrage_id und match_id. Archivieren setzt match_id
-- auf null (on delete set null); ohne objekt_id fehlte dem Rapport dann das Objekt.
-- Ab jetzt setzt matchSenden objekt_id selbst; hier die bestehenden Zeilen nachtragen,
-- solange der Treffer noch aktiv ist.
update nachrichten n
set objekt_id = m.objekt_id
from matches m
where n.match_id = m.id and n.typ = 'angebot' and n.objekt_id is null;

-- Gleiche Signatur und Rechte wie in archiv_f1. Neu: nur Treffer mit Status 'neu' löschen.
-- Die App liest die IDs vorher (entferneNeueTreffer); wird ein Treffer dazwischen gesendet
-- oder reserviert, darf er nicht mehr still verschwinden (Race).
create or replace function treffer_entfernen(p_ids uuid[], p_grund text)
returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  -- Leerer Grund wird im Trigger zu 'unbekannt'; null würde set_config nicht sauber setzen.
  perform set_config('immoheart.archiv_grund', coalesce(p_grund, ''), true);
  delete from matches x where x.id = any(p_ids) and x.status = 'neu';
end $$;

revoke execute on function treffer_entfernen(uuid[], text) from public, anon;
grant execute on function treffer_entfernen(uuid[], text) to authenticated;
