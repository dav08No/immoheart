-- Sicherheits-Audit 2026-11: Die anon-Policy auf objekt_fotos prüfte nur archiviert_am.
-- Wirksam war sie trotzdem richtig, weil die Unterabfrage als anon unter der RLS von
-- objekte läuft (versteckte Objekte sind dort unsichtbar). Hier dieselben Bedingungen wie
-- in "oeffentlich liest gelistete objekte" ausdrücklich, damit die Foto-Freigabe nicht
-- still von jener Policy abhängt. Nur einschränkend, weil Preview und Produktion sich die
-- DB teilen.
drop policy "oeffentlich liest fotos gelisteter objekte" on objekt_fotos;
create policy "oeffentlich liest fotos gelisteter objekte" on objekt_fotos for select to anon
  using (exists (
    select 1 from objekte o
    where o.id = objekt_fotos.objekt_id
      and o.oeffentlich
      and o.status in ('verfuegbar', 'reserviert')
      and o.archiviert_am is null
  ));
