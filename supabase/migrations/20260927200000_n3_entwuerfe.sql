-- Relaunch N3: echter Versand über Gmail. message_id/in_reply_to/referenzen
-- halten den Mailverlauf beim Empfänger zusammen; versand_fehler zeigt
-- fehlgeschlagene Versuche am Entwurf; geloescht_am ersetzt physisches Löschen
-- (Statistik "gesendet vs. gelöscht" ab N7); antwort_auf verknüpft einen Entwurf
-- mit der Eingangsmail, auf die er antwortet.
alter table nachrichten
  add column message_id text unique,
  add column in_reply_to text,
  add column referenzen text,
  add column versand_fehler text,
  add column geloescht_am timestamptz,
  add column antwort_auf uuid references nachrichten (id) on delete set null;

alter type nachricht_typ_enum add value if not exists 'antwort';
alter type nachricht_typ_enum add value if not exists 'frei';

create index if not exists nachrichten_anfrage_gesendet_idx
  on nachrichten (anfrage_id, gesendet_am) where richtung = 'gesendet';
