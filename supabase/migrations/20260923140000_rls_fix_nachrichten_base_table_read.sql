-- Kritischer Fund (M5 Whole-Branch-Review): identisches Muster wie bereits in
-- 20260923033041_rls_fix_base_table_read.sql für anfragen behoben. Jede
-- eingeloggte Rolle -- inklusive leser -- konnte nachrichten direkt lesen:
-- Rohtext eingehender Mails UND die von der KI extrahierten Felder (firma,
-- budget_pro_m2 usw., siehe erkannte_felder), also dieselben sensiblen Angaben,
-- die einmal in einer vertraulichen Anfrage gelandet über anfragen_sichtbar vor
-- leser maskiert werden. Für nachrichten gab es dafür überhaupt keine
-- Einschränkung.
--
-- Anders als anfragen hat nachrichten keine vertraulich-Spalte und keine
-- maskierende View -- es gibt für leser hier nichts zu maskieren, sondern
-- schlicht nichts zu sehen. /postfach und alle zugehörigen Server Actions
-- (app/actions/nachrichten.ts) sind Postfach-/Triage-Werkzeug für die Person,
-- die eingehende Mails bearbeitet; laut README-Rollenmodell ist das admin/
-- vermittler, nicht leser. Die bestehenden insert/update/delete-Policies auf
-- nachrichten (siehe 20260922195659_rls.sql) schränken bereits korrekt auf
-- admin/vermittler ein -- nur die select-Policy hatte das generische
-- "eingeloggt liest"-Muster übernommen und muss analog zu anfragen
-- nachgezogen werden.
drop policy "eingeloggt liest nachrichten" on nachrichten;
create policy "vermittler liest nachrichten" on nachrichten for select
  to authenticated
  using (current_rolle() in ('admin', 'vermittler'));
