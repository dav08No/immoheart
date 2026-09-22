insert into firmen (id, name, branche, kontakt_email) values
  ('11111111-1111-1111-1111-111111111101', 'Helvetia Dental Labor', 'Medizintechnik', 'kontakt@helvetia-dental.ch'),
  ('11111111-1111-1111-1111-111111111102', 'Meier Präzisionstechnik AG', 'Fertigung', 'kontakt@meier-praezision.ch'),
  ('11111111-1111-1111-1111-111111111103', 'Studio Bruggmann', 'Kreativ', 'n.bruggmann@studiobruggmann.ch'),
  ('11111111-1111-1111-1111-111111111104', 'Beat''s Musikbar GmbH', 'Gastro', 'kontakt@beats-musikbar.ch'),
  ('11111111-1111-1111-1111-111111111105', 'Frischwerk Getränke AG', 'Handel', 'kontakt@frischwerk.ch'),
  ('11111111-1111-1111-1111-111111111106', 'Lagerhaus Aare GmbH', 'Logistik', 'kontakt@lagerhaus-aare.ch'),
  ('11111111-1111-1111-1111-111111111107', 'Kaufmann Baunebengewerbe', 'Bau', 'm.kaufmann@kaufmann-bau.ch'),
  ('11111111-1111-1111-1111-111111111108', 'Nordwest Metallbau AG', 'Metallbau', 'r.hunziker@nordwest-metallbau.ch'),
  ('11111111-1111-1111-1111-111111111109', 'Thermo-Kunststoff GmbH', 'Kunststoff', 'b.frei@thermo-kunststoff.ch');

insert into objekte (id, titel, adresse, ort, flaeche, preis_pro_m2, nutzung, eigenschaften, verfuegbar_ab, eigentuemer, foto_url, status) values
  ('22222222-2222-2222-2222-222222222201', 'Büro Altstadt', 'Hauptgasse 12, 4500 Solothurn', 'Solothurn', 240, 245, 'buero', '{}', '2026-11-01', 'Bürgergemeinde', null, 'verfuegbar'),
  ('22222222-2222-2222-2222-222222222202', 'Gewerbehalle Zuchwil', 'Industriestrasse 10, 4528 Zuchwil', 'Zuchwil', 2400, 128, 'gewerbe', '{"kran_tonnen": 16}', '2026-10-01', 'Privat', null, 'verfuegbar'),
  ('22222222-2222-2222-2222-222222222203', 'Gewerbe Bettlach', 'Industriestrasse 4, 2544 Bettlach', 'Bettlach', 380, 158, 'gewerbe', '{}', '2026-09-01', 'Suter Immobilien AG', null, 'verfuegbar'),
  ('22222222-2222-2222-2222-222222222204', 'Logistik Derendingen', 'Gewerbestrasse 5, 4552 Derendingen', 'Derendingen', 2850, 121, 'lager', '{"rampe": true}', '2026-09-01', 'Aare Invest AG', null, 'verfuegbar'),
  ('22222222-2222-2222-2222-222222222205', 'Produktionshalle Biberist', 'Fabrikstrasse 2, 4562 Biberist', 'Biberist', 2300, 112, 'produktion', '{}', '2026-09-01', 'Privat', null, 'verfuegbar'),
  ('22222222-2222-2222-2222-222222222206', 'Bauland Luterbach', 'Arbeitszone, 4542 Luterbach', 'Luterbach', 6200, null, 'bauland', '{}', '2026-09-01', 'Gemeinde Luterbach', null, 'verfuegbar');

insert into anfragen (id, firma_id, flaeche_min, flaeche_max, ort, budget_pro_m2, bezug, nutzung, anforderungen, status, vertraulich, letzter_kontakt) values
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111101', 320, 450, 'Bettlach', 165, 'Q1 2027', 'produktion', '{}', 'offen', false, now() - interval '1 day'),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111102', 1800, 2600, 'Wasseramt', 130, 'Q2 2027', 'produktion', '{}', 'offen', false, now() - interval '3 days'),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111103', 180, 260, 'Solothurn', 250, 'Q4 2026', 'buero', '{}', 'offen', false, now() - interval '12 days'),
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111104', 200, 300, 'Solothurn', 210, 'Q1 2027', 'gewerbe', '{}', 'offen', false, now() - interval '15 days'),
  ('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111105', 1500, 2500, 'Solothurn', 110, 'Q1 2027', 'lager', '{}', 'offen', false, now() - interval '22 days'),
  ('33333333-3333-3333-3333-333333333306', '11111111-1111-1111-1111-111111111106', 2000, 3000, 'Solothurn', 118, 'sofort', 'lager', '{"rampe": true}', 'offen', true, now() - interval '41 days'),
  ('33333333-3333-3333-3333-333333333307', '11111111-1111-1111-1111-111111111107', 1900, 2400, 'Bucheggberg', null, null, 'gewerbe', '{}', 'offen', false, now() - interval '63 days'),
  ('33333333-3333-3333-3333-333333333308', '11111111-1111-1111-1111-111111111108', 2200, null, 'Zuchwil', 125, 'Q4 2026', 'produktion', '{"kran_tonnen": 16}', 'offen', false, now() - interval '96 days');

insert into regeln (code, beschreibung, angewendet_count, aktiv) values
  ('R-01', 'Laute Nutzungen nicht in die Altstadt', 3, true),
  ('R-02', 'Logistik nur mit Rampe', 11, true),
  ('R-03', 'Produktion über 1500 m² nur in Arbeitszone', 24, true),
  ('R-04', 'Budget bis ±12 % gilt als Treffer', 31, true),
  ('R-05', 'Gastro erst nach Bewilligungscheck', 5, true),
  ('R-06', 'Bezug «offen» nach 90 Tagen ruhend', 9, true);
