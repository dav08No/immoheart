create extension if not exists pgcrypto;

create type rolle_enum as enum ('admin', 'vermittler', 'leser');
create type nutzung_enum as enum ('buero', 'gewerbe', 'produktion', 'lager', 'verkauf', 'bauland');
create type anfrage_status_enum as enum ('offen', 'vermittelt', 'ruhend');
create type objekt_status_enum as enum ('verfuegbar', 'reserviert', 'vermietet');
create type match_status_enum as enum ('neu', 'gesendet', 'verworfen');
create type nachricht_richtung_enum as enum ('eingang', 'entwurf', 'gesendet');
create type nachricht_typ_enum as enum ('anfrage', 'angebot', 'rueckfrage', 'nachfass');

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  rolle rolle_enum not null default 'leser',
  freigabe_stufe smallint not null default 1,
  created_at timestamptz not null default now()
);

create table firmen (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  branche text,
  website text,
  kontakt_name text,
  kontakt_email text,
  created_at timestamptz not null default now()
);

create table anfragen (
  id uuid primary key default gen_random_uuid(),
  firma_id uuid references firmen (id),
  flaeche_min int,
  flaeche_max int,
  -- nullable, obwohl im README nicht explizit als Lücke genannt: eine per KI
  -- aus Mailtext gelesene Anfrage nennt nicht immer klar einen Ort. Ein
  -- Platzhalter-String hier würde die "null -> Anzeige als ?"-Konvention
  -- unterlaufen und wäre eine versteckte Lücke, die als echter Wert durchgeht.
  ort text,
  budget_pro_m2 numeric,
  bezug text,
  nutzung nutzung_enum not null,
  anforderungen jsonb not null default '{}',
  status anfrage_status_enum not null default 'offen',
  vertraulich boolean not null default false,
  letzter_kontakt timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table objekte (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  adresse text not null,
  ort text not null,
  flaeche int not null,
  preis_pro_m2 numeric,
  nutzung nutzung_enum not null,
  eigenschaften jsonb not null default '{}',
  verfuegbar_ab date not null,
  eigentuemer text not null,
  foto_url text,
  status objekt_status_enum not null default 'verfuegbar',
  created_at timestamptz not null default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  anfrage_id uuid not null references anfragen (id) on delete cascade,
  objekt_id uuid not null references objekte (id) on delete cascade,
  score smallint not null,
  kriterien jsonb not null,
  hinweis text not null,
  status match_status_enum not null default 'neu',
  created_at timestamptz not null default now(),
  unique (anfrage_id, objekt_id)
);

create table nachrichten (
  id uuid primary key default gen_random_uuid(),
  richtung nachricht_richtung_enum not null,
  typ nachricht_typ_enum not null,
  anfrage_id uuid references anfragen (id) on delete set null,
  match_id uuid references matches (id) on delete set null,
  von text not null,
  an text not null,
  betreff text not null,
  body text not null,
  erkannte_felder jsonb,
  gesendet_am timestamptz,
  created_at timestamptz not null default now()
);

create table regeln (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  beschreibung text not null,
  angewendet_count int not null default 0,
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);
