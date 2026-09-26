-- Relaunch N2: Supabase gibt anon standardmässig volle Rechte auf jede neu
-- angelegte Tabelle, Sequenz und Funktion. Künftige Tabellen (N3+) sollen für
-- anonyme Besucher gesperrt beginnen; Freigaben erfolgen dann gezielt.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- Profile ändern nur noch geprüfte Server Actions mit dem Service-Role-Key
-- (Name, Recht, aktiv). Eingeloggte Nutzer brauchen kein direktes Update-Recht;
-- es gibt dafür auch keine Policy mehr.
revoke update on table profiles from authenticated;
