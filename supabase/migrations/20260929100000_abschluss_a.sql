-- Abschluss A: nur additive Änderungen (Preview und Produktion teilen die DB).
alter type match_status_enum add value if not exists 'reserviert';
alter type match_status_enum add value if not exists 'vermittelt';
alter type match_status_enum add value if not exists 'abgelehnt';
alter type match_status_enum add value if not exists 'erledigt';
alter type nachricht_kategorie_enum add value if not exists 'objektmeldung';
alter type nachricht_typ_enum add value if not exists 'absage';
alter type nachricht_typ_enum add value if not exists 'eigentuemer_info';
alter type nachricht_typ_enum add value if not exists 'bestaetigung';

alter table matches
  add column if not exists angeboten_am timestamptz,
  add column if not exists reserviert_am timestamptz,
  add column if not exists abgeschlossen_am timestamptz;

alter table objekte add column if not exists eigentuemer_email text
  check (eigentuemer_email is null or eigentuemer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Eigentümer-Adresse aus der ältesten verknüpften Objektangebot-Mail übernehmen.
update objekte o set eigentuemer_email = lower(sub.von)
from (
  select distinct on (objekt_id) objekt_id, von from nachrichten
  where richtung = 'eingang' and objekt_id is not null and von like '%@%'
  order by objekt_id, coalesce(empfangen_am, created_at)
) sub
where sub.objekt_id = o.id and o.eigentuemer_email is null;

-- angeboten_am aus der ersten wirklich gesendeten Angebotsmail je Treffer.
update matches m set angeboten_am = sub.erst
from (
  select match_id, min(gesendet_am) as erst from nachrichten
  where richtung = 'gesendet' and match_id is not null group by match_id
) sub
where sub.match_id = m.id and m.angeboten_am is null;

-- Lücke 2 (Altfälle): 'gesendet' ohne gesendete Mail und ohne offenen Entwurf -> 'neu'.
update matches m set status = 'neu'
where m.status = 'gesendet' and m.angeboten_am is null
  and not exists (
    select 1 from nachrichten n
    where n.match_id = m.id and n.richtung = 'entwurf' and n.geloescht_am is null
  );
