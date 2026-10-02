-- Abschluss C (Ruling R13): die zwei idempotenten Backfills aus Migration A nach dem
-- Produktions-Deploy wiederholen. Bis zum Deploy setzte der alte Code Treffer schon beim
-- Anlegen des Entwurfs auf 'gesendet' und nie angeboten_am.

update matches m set angeboten_am = sub.erst
from (
  select match_id, min(gesendet_am) as erst from nachrichten
  where richtung = 'gesendet' and match_id is not null group by match_id
) sub
where sub.match_id = m.id and m.angeboten_am is null;

-- Anders als in A auch mit offenem Entwurf: im neuen Ablauf bleibt ein Treffer 'neu', bis die
-- Mail wirklich raus ist (entwurfSenden setzt dann 'gesendet' + angeboten_am); "Angebot
-- entwerfen" öffnet den bestehenden Entwurf. Sonst bliebe angeboten_am für immer leer.
update matches m set status = 'neu'
where m.status = 'gesendet' and m.angeboten_am is null;
