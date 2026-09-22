alter table profiles enable row level security;
alter table firmen enable row level security;
alter table anfragen enable row level security;
alter table objekte enable row level security;
alter table matches enable row level security;
alter table nachrichten enable row level security;
alter table regeln enable row level security;

create function current_rolle() returns rolle_enum
language sql security definer stable as $$
  select rolle from profiles where user_id = auth.uid()
$$;

-- profiles: jede/r sieht das eigene Profil, admin sieht alle
create policy "eigenes profil lesen" on profiles for select
  using (user_id = auth.uid() or current_rolle() = 'admin');
create policy "eigenes profil aktualisieren" on profiles for update
  using (user_id = auth.uid() or current_rolle() = 'admin');
create policy "admin verwaltet profile" on profiles for insert
  with check (current_rolle() = 'admin');
create policy "admin loescht profile" on profiles for delete
  using (current_rolle() = 'admin');

-- generisches Muster für die übrigen Tabellen: lesen für alle eingeloggten
-- Nutzer, schreiben nur für admin/vermittler
create policy "eingeloggt liest firmen" on firmen for select
  using (auth.role() = 'authenticated');
create policy "vermittler schreibt firmen" on firmen for insert
  with check (current_rolle() in ('admin', 'vermittler'));
create policy "vermittler aendert firmen" on firmen for update
  using (current_rolle() in ('admin', 'vermittler'));
create policy "vermittler loescht firmen" on firmen for delete
  using (current_rolle() in ('admin', 'vermittler'));

create policy "eingeloggt liest anfragen" on anfragen for select
  using (auth.role() = 'authenticated');
create policy "vermittler schreibt anfragen" on anfragen for insert
  with check (current_rolle() in ('admin', 'vermittler'));
create policy "vermittler aendert anfragen" on anfragen for update
  using (current_rolle() in ('admin', 'vermittler'));
create policy "vermittler loescht anfragen" on anfragen for delete
  using (current_rolle() in ('admin', 'vermittler'));

create policy "eingeloggt liest objekte" on objekte for select
  using (auth.role() = 'authenticated');
create policy "vermittler schreibt objekte" on objekte for insert
  with check (current_rolle() in ('admin', 'vermittler'));
create policy "vermittler aendert objekte" on objekte for update
  using (current_rolle() in ('admin', 'vermittler'));
create policy "vermittler loescht objekte" on objekte for delete
  using (current_rolle() in ('admin', 'vermittler'));

create policy "eingeloggt liest matches" on matches for select
  using (auth.role() = 'authenticated');
create policy "vermittler schreibt matches" on matches for insert
  with check (current_rolle() in ('admin', 'vermittler'));
create policy "vermittler aendert matches" on matches for update
  using (current_rolle() in ('admin', 'vermittler'));
create policy "vermittler loescht matches" on matches for delete
  using (current_rolle() in ('admin', 'vermittler'));

create policy "eingeloggt liest nachrichten" on nachrichten for select
  using (auth.role() = 'authenticated');
create policy "vermittler schreibt nachrichten" on nachrichten for insert
  with check (current_rolle() in ('admin', 'vermittler'));
create policy "vermittler aendert nachrichten" on nachrichten for update
  using (current_rolle() in ('admin', 'vermittler'));
create policy "vermittler loescht nachrichten" on nachrichten for delete
  using (current_rolle() in ('admin', 'vermittler'));

create policy "eingeloggt liest regeln" on regeln for select
  using (auth.role() = 'authenticated');
create policy "vermittler schreibt regeln" on regeln for insert
  with check (current_rolle() in ('admin', 'vermittler'));
create policy "vermittler aendert regeln" on regeln for update
  using (current_rolle() in ('admin', 'vermittler'));

-- Vertrauliche Anfragen: leser sieht weder firma_id noch budget_pro_m2
create view anfragen_sichtbar as
select
  a.id,
  case when a.vertraulich and current_rolle() = 'leser' then null else a.firma_id end as firma_id,
  a.flaeche_min,
  a.flaeche_max,
  a.ort,
  case when a.vertraulich and current_rolle() = 'leser' then null else a.budget_pro_m2 end as budget_pro_m2,
  a.bezug,
  a.nutzung,
  a.anforderungen,
  a.status,
  a.vertraulich,
  a.letzter_kontakt,
  a.created_at
from anfragen a;
