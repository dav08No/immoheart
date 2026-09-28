-- Relaunch N7 Politur (Task 6): formular_zaehlen räumt beim Zählen abgelaufene Fenster
-- (älter als 1 Tag) weg, sonst wächst formular_limits unbegrenzt. Gleiche Signatur,
-- security definer, search_path und Rechte wie in der N5-Migration -- additiv per
-- "create or replace function", keine neue Migration für die Tabelle selbst nötig.
-- plpgsql statt sql: DELETE + INSERT als zwei Anweisungen: bleibt atomar, weil die ganze
-- Funktion (wie jeder RPC-Aufruf) in einer Transaktion läuft -- kein Lesen-dann-Schreiben-
-- Rennen bei parallelen Einsendungen.
create or replace function formular_zaehlen(p_ip_hash text, p_fenster timestamptz) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_zaehler int;
begin
  delete from formular_limits where fenster_start < now() - interval '1 day';
  insert into formular_limits (ip_hash, fenster_start, zaehler) values (p_ip_hash, p_fenster, 1)
  on conflict (ip_hash, fenster_start) do update set zaehler = formular_limits.zaehler + 1
  returning zaehler into v_zaehler;
  return v_zaehler;
end;
$$;
revoke execute on function formular_zaehlen(text, timestamptz) from public, anon, authenticated;
grant execute on function formular_zaehlen(text, timestamptz) to service_role;
