-- Relaunch N1, Härtung während des Übergangs (A + Sperre eingespielt, B noch nicht):
-- 1. Die alte Policy "eigenes profil aktualisieren" beschränkt keine Spalten. Ohne
--    diese Einschränkung könnte sich jedes Konto selbst aktiv = true setzen und über
--    die "aktives konto"-Policies vollen Zugriff holen. Eingeloggte dürfen am eigenen
--    Profil nur noch name und freigabe_stufe ändern (Letzteres braucht die alte App).
-- 2. Die alten "eingeloggt liest"-Policies prüfen aktiv nicht. Aktive Konten sind
--    über die "aktives konto"-Policies abgedeckt; inaktive sollen nichts mehr lesen.
revoke update on table profiles from authenticated;
grant update (name, freigabe_stufe) on table profiles to authenticated;

drop policy if exists "eingeloggt liest firmen" on firmen;
drop policy if exists "eingeloggt liest matches" on matches;
drop policy if exists "eingeloggt liest nachrichten" on nachrichten;
drop policy if exists "eingeloggt liest objekte" on objekte;
