-- Archiv F2: Lösch-Sperre auf objekte und anfragen.
-- ERST NACH DEM PRODUKTIONS-DEPLOY von feature/rapport anwenden (Plan Task 10): Der alte Code
-- auf main löscht Anfragen noch direkt (Rollback) und würde sonst scheitern.
-- Objekte und Anfragen werden archiviert, nicht gelöscht. Ausnahmen setzen die Funktionen
-- aus F1 transaktionslokal: anfrage_rollback ('immoheart.rollback') und das endgültige
-- Löschen archivierter Datensätze ('immoheart.endgueltig').

create function loeschen_sperren() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  -- Rollback einer Doppelklick-Dublette gibt es nur für Anfragen.
  if tg_table_name = 'anfragen' and current_setting('immoheart.rollback', true) = '1' then
    return old;
  end if;
  if current_setting('immoheart.endgueltig', true) = '1' and old.archiviert_am is not null then
    return old;
  end if;
  raise exception 'Objekte und Anfragen werden archiviert, nicht gelöscht.';
end $$;
-- Nur als Trigger gedacht, nicht per RPC aufrufbar.
revoke execute on function loeschen_sperren() from public, anon, authenticated;

create trigger objekte_loeschen_sperren before delete on objekte
  for each row execute function loeschen_sperren();
create trigger anfragen_loeschen_sperren before delete on anfragen
  for each row execute function loeschen_sperren();
