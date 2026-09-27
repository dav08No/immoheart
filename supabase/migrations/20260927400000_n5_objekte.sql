-- Relaunch N5: Objektfotos, öffentliche Objektsuche, Website-Anfragen.
alter table objekte
  add column beschreibung text,
  add column oeffentlich boolean not null default true;

alter table anfragen
  add column quelle text not null default 'mail' check (quelle in ('mail', 'website', 'manuell')),
  add column objekt_id uuid references objekte (id) on delete set null;

create table objekt_fotos (
  id uuid primary key default gen_random_uuid(),
  objekt_id uuid not null references objekte (id) on delete cascade,
  pfad text not null unique,
  reihenfolge int not null default 0,
  created_at timestamptz not null default now()
);
create index objekt_fotos_objekt on objekt_fotos (objekt_id, reihenfolge);
alter table objekt_fotos enable row level security;
create policy "aktives konto verwaltet objekt_fotos" on objekt_fotos for all to authenticated
  using (ist_aktives_konto()) with check (ist_aktives_konto());
revoke all on table objekt_fotos from anon;
-- Besucher sehen nur Fotos gelisteter Objekte; die Unterabfrage läuft mit den
-- anon-Rechten auf objekte (Spaltenrechte + Zeilen-Policy), verrät also nichts Neues.
grant select (id, objekt_id, pfad, reihenfolge) on table objekt_fotos to anon;
create policy "oeffentlich liest fotos gelisteter objekte" on objekt_fotos for select to anon
  using (exists (select 1 from objekte o where o.id = objekt_fotos.objekt_id));

-- Öffentliche Freigabe um Beschreibung und Sichtbarkeit erweitern.
grant select (beschreibung, oeffentlich) on table objekte to anon;
drop policy "oeffentlich liest gelistete objekte" on objekte;
create policy "oeffentlich liest gelistete objekte" on objekte for select to anon
  using (oeffentlich and status in ('verfuegbar', 'reserviert'));
-- Spalten nur hinten anfügen: create or replace view erlaubt keine Umordnung, und der
-- laufende Code auf main liest die View bereits.
create or replace view objekte_oeffentlich with (security_invoker = true) as
  select id, titel, ort, flaeche, preis_pro_m2, nutzung, eigenschaften, verfuegbar_ab, status, created_at, beschreibung
  from objekte
  where oeffentlich and status in ('verfuegbar', 'reserviert');
grant select on objekte_oeffentlich to anon, authenticated;

-- Formular-Limit: je gesalzenem IP-Hash und Stunden-Fenster ein Zähler.
create table formular_limits (
  ip_hash text not null,
  fenster_start timestamptz not null,
  zaehler int not null default 0,
  primary key (ip_hash, fenster_start)
);
alter table formular_limits enable row level security;
revoke all on table formular_limits from anon, authenticated;

-- Atomar zählen (kein Lesen-dann-Schreiben-Rennen bei parallelen Einsendungen).
create function formular_zaehlen(p_ip_hash text, p_fenster timestamptz) returns int
language sql security definer set search_path = public, pg_temp as $$
  insert into formular_limits (ip_hash, fenster_start, zaehler) values (p_ip_hash, p_fenster, 1)
  on conflict (ip_hash, fenster_start) do update set zaehler = formular_limits.zaehler + 1
  returning zaehler
$$;
revoke execute on function formular_zaehlen(text, timestamptz) from public, anon, authenticated;
grant execute on function formular_zaehlen(text, timestamptz) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('objekt-fotos', 'objekt-fotos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
