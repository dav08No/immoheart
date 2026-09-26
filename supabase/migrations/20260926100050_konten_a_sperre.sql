-- Relaunch N1, Nachtrag zu Teil A: Solange die alte App mit Selbstregistrierung
-- live ist, würde jedes neu registrierte Konto über aktiv = true (Default) und die
-- "aktives konto"-Policies sofort vollen Zugriff erhalten. Deshalb: neue Profile
-- sind standardmässig inaktiv, bestehende leser-Konten werden deaktiviert. Konten
-- aus der Nutzerverwaltung (ab N2) setzen aktiv ausdrücklich auf true.
alter table profiles alter column aktiv set default false;
update profiles set aktiv = false where rolle = 'leser';
