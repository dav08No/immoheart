-- Relaunch N4: automatischer Gmail-Eingang mit KI-Einordnung.
create type nachricht_kategorie_enum as enum ('suchanfrage', 'antwort', 'objektangebot', 'objektanfrage', 'sonstiges');

alter table nachrichten
  add column quelle text not null default 'mail' check (quelle in ('mail', 'website')),
  add column kategorie nachricht_kategorie_enum,
  -- offen -> laeuft -> fertig | fehler; null bei Entwürfen und gesendeten Mails.
  add column ki_status text check (ki_status in ('offen', 'laeuft', 'fertig', 'fehler')),
  add column ki_gestartet_am timestamptz,
  add column ki_fehler text,
  add column objekt_id uuid references objekte (id) on delete set null,
  add column anhaenge jsonb not null default '[]',
  add column gelesen boolean not null default false,
  add column empfangen_am timestamptz;

create table nachricht_anhaenge (
  id uuid primary key default gen_random_uuid(),
  nachricht_id uuid not null references nachrichten (id) on delete cascade,
  pfad text not null unique,
  dateiname text not null,
  mime_type text not null,
  groesse int not null,
  created_at timestamptz not null default now()
);
alter table nachricht_anhaenge enable row level security;
create policy "aktives konto verwaltet anhaenge" on nachricht_anhaenge for all to authenticated
  using (ist_aktives_konto()) with check (ist_aktives_konto());
revoke all on table nachricht_anhaenge from anon;

-- Eine einzige Zeile als Sperre: höchstens ein Abruf pro 60 s, auch bei mehreren offenen Tabs.
create table mail_abruf (
  id smallint primary key default 1 check (id = 1),
  letzter_start timestamptz,
  letzter_erfolg timestamptz,
  letzter_fehler text,
  letzter_fehler_am timestamptz
);
insert into mail_abruf (id) values (1);
alter table mail_abruf enable row level security;
create policy "aktives konto verwaltet mail_abruf" on mail_abruf for all to authenticated
  using (ist_aktives_konto()) with check (ist_aktives_konto());
revoke all on table mail_abruf from anon;

-- Privater Bucket; Zugriff ausschliesslich serverseitig (Service-Role) nach Login-Prüfung,
-- Anzeige über kurzlebige signierte URLs. Keine storage.objects-Policies für Nutzerrollen.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mail-anhaenge', 'mail-anhaenge', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict (id) do nothing;
