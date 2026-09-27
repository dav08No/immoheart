# Relaunch N5 · Objektfotos, öffentliche Objektsuche, „Objekt anfragen“ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Objekte bekommen Fotos (Upload, Reihenfolge, Titelbild, auch direkt aus Mail-Anhängen übernommen), eine Beschreibung und einen Sichtbarkeits-Schalter; Besucher finden sie ohne Login unter `/objekte` mit Filtern, öffnen die Detailseite und fragen ein Objekt per Formular an. Die Anfrage landet als Website-Eintrag mit Entwurf im Postfach.

**Architecture:** Öffentliche Daten kommen weiterhin nur über die `security_invoker`-View `objekte_oeffentlich` plus Spaltenrechte für `anon` (keine Adresse, kein Eigentümer). Fotos liegen im öffentlichen Bucket `objekt-fotos`; Zeilen in `objekt_fotos`. Uploads laufen direkt vom Browser in den Storage über signierte Upload-URLs, die eine Server Action nach Login-Prüfung ausstellt (keine grossen Request-Bodies durch Vercel). Die Objektsuche lädt alle öffentlichen Objekte serverseitig und filtert/sortiert sie in einer reinen, getesteten Funktion (kleiner Bestand). Öffentliche Formulare sind Server Actions mit zod, Honeypot, Mindest-Ausfüllzeit (signiertes Zeit-Token) und Limit 5/Stunde je IP (gesalzener Hash, Tabelle `formular_limits`, atomar per SQL-Funktion). Der Antwort-Entwurf zu einer Website-Anfrage ist eine feste Vorlage, **keine KI** (Besucher sollen kein Gemini-Kontingent verbrauchen können).

**Tech Stack:** Next.js 15.5, Supabase (Postgres, Storage), radix-ui 1.6.7 (Slider, Checkbox, Switch aus dem vorhandenen Meta-Paket), shadcn-Muster in `components/shadcn`, zod 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-26-relaunch-design.md` — Abschnitt 1 (Routen, öffentliche Datenfreigabe), 2 (Website-Einträge), 3 (`/admin/postfach` Anhänge, `/admin/objekte`), 4 (`/objekte`, `/objekte/[id]`), 5 (Migrationen, Sicherheit, Tests), Meilenstein N5.

## Global Constraints

- Alle Regeln aus N1–N4: Namen deutsch, kein `any`, Dateien < 200 Zeilen, Datenzugriff in `lib/queries/`, Kommentare nur für das *Warum* und kurz.
- **Öffentlich nie Adresse oder Eigentümer** — weder im HTML noch in einer API-/RSC-Antwort. Öffentliche Seiten lesen ausschliesslich `objekte_oeffentlich` und `objekt_fotos` mit dem normalen Server-Client (Rolle `anon` bzw. eingeloggt), nie mit dem Admin-Client.
- URL-Parameter der Objektsuche werden mit zod gegen feste Werte geprüft; ungültige Werte werden ignoriert (kein Fehler, keine Ausgabe des Rohwerts).
- Kein `dangerouslySetInnerHTML`. `mailto`/Links mit `encodeURIComponent`.
- Öffentliche Formulare: zod, Honeypot, Mindestzeit 3 s, max. 5 Einsendungen pro IP und Stunde (IP nur als gesalzener Hash), **keine Mail an den Besucher**, Danke-Zustand; bei Fehlern bleiben Eingaben erhalten und die Meldung steht am Feld.
- Objektfotos: nur `image/jpeg|png|webp`, höchstens 5 MB; hochladen, ändern, löschen nur eingeloggt mit aktivem Profil (Server Action prüft `holeEigenesProfil()` zuerst).
- Jede Admin-Action prüft zuerst `holeEigenesProfil()`; erwartete Fehler als `NutzerFehler` → `{ fehler }`.
- Neue Tabellen: RLS an, Policy „aktives konto …“, `revoke all … from anon` (gezielte anon-Rechte nur wo unten verlangt).
- Nichts wird automatisch gesendet; Website-Einträge erzeugen nur Entwürfe.
- Pakete exakt pinnen, `npm audit --omit=dev` ohne high/critical.
- Testdaten tragen „[TEST]“; nach dem Live-Test aufräumen (Eingänge soft-deleten, siehe N4).
- Commits enden mit Leerzeile und exakt:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01CbSKvzEHCKZUWFsZgFgstd`
- Branch `feature/n5-objekte`, Worktree `.worktrees/n5`. Blockierte Befehle: BLOCKED melden.

## Dateiübersicht

| Datei | Aktion | Zweck |
|---|---|---|
| `supabase/migrations/20260927400000_n5_objekte.sql` | neu | Spalten, `objekt_fotos`, `formular_limits` + Funktion, Bucket, View |
| `lib/objektsuche.ts` (+Test) | neu | Filter aus URL (zod), Filtern/Sortieren, Filter → URL |
| `lib/formular-schutz.ts` (+Test) | neu | Zeit-Token, Honeypot/Mindestzeit-Prüfung, IP-Hash, Fenster |
| `lib/website-eintrag.ts` (+Test) | neu | Nachricht + Entwurfsvorlage aus einer Objektanfrage |
| `lib/queries/oeffentlich.ts` | neu | öffentliche Objekte + Fotos (Server-Client) |
| `lib/queries/fotos.ts` | neu | Foto-Zeilen, signierte Upload-URLs, Kopieren aus Mail-Anhang (Admin-Client) |
| `lib/queries/formular-limits.ts` | neu | Zähler über RPC (Admin-Client) |
| `app/actions/objektanfrage.ts` | neu | öffentliche Action „Objekt anfragen“ |
| `app/actions/fotos.ts` | neu | Upload vorbereiten/registrieren, Reihenfolge, Löschen, aus Mail übernehmen |
| `app/actions/passwort.ts` | ändern | Rate-Limit für „Passwort vergessen“ |
| `app/(public)/objekte/page.tsx`, `[id]/page.tsx` | neu | Liste mit Filtern, Detail |
| `components/public/objekte/*` | neu | Filterleiste/Sheet, Karte, Galerie, Anfrageformular |
| `components/objekte/*` | ändern | Fotos-Verwaltung, Beschreibung, Sichtbarkeit, Direktanfragen |
| `components/postfach/*`, `lib/postfach.ts`, `app/actions/nachrichten.ts` | ändern | „Als Objektfoto übernehmen“, „Anhang löschen“, Objektanfrage-Block |

---

### Task 1: Migration, Bucket, Typen (Controller)

**Files:** `supabase/migrations/20260927400000_n5_objekte.sql`, `types/database.ts`

- [ ] **Step 1: Migration**

```sql
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
```

- [ ] **Step 2:** Controller spielt ein (`apply_migration` `n5_objekte`), prüft: anon-Grants (`objekt_fotos` nur die 4 Spalten, `formular_limits` keine), Bucket öffentlich, `select * from objekte_oeffentlich` als anon (per `set role anon`) liefert keine Adresse. Typen neu erzeugen, `npx tsc --noEmit`, Commit.

---

### Task 2: Reine Logik (TDD)

**Files:** `lib/objektsuche.ts` (+`.test.ts`), `lib/formular-schutz.ts` (+`.test.ts`), `lib/website-eintrag.ts` (+`.test.ts`)

**Interfaces (Produces):**

`lib/objektsuche.ts`
```ts
export type Sortierung = "neu" | "flaeche" | "preis"
export type ObjektFilter = {
  nutzung: Nutzung[]; orte: string[]; flaecheMin: number | null; flaecheMax: number | null
  preisMax: number | null; verfuegbarBis: string | null; eigenschaften: string[]; sortierung: Sortierung
}
export type OeffentlichesObjekt = {
  id: string; titel: string; ort: string; flaeche: number; preis_pro_m2: number | null; nutzung: Nutzung
  eigenschaften: Record<string, unknown>; verfuegbar_ab: string; status: "verfuegbar" | "reserviert"
  created_at: string; beschreibung: string | null; titelbild: string | null
}
export function leseFilter(params: Record<string, string | string[] | undefined>, bekannteOrte: string[], bekannteEigenschaften: string[]): ObjektFilter
export function filtereObjekte(objekte: OeffentlichesObjekt[], f: ObjektFilter): OeffentlichesObjekt[]
export function filterZuSuchparametern(f: ObjektFilter): URLSearchParams   // nur gesetzte Werte, stabile Reihenfolge
export function eigenschaftsSchluessel(objekte: OeffentlichesObjekt[]): string[] // Schlüssel mit truthy Wert in mind. einem Objekt, sortiert
export function aehnlicheObjekte(alle: OeffentlichesObjekt[], objekt: OeffentlichesObjekt, max: number): OeffentlichesObjekt[] // gleiche Nutzung oder gleicher Ort, ohne sich selbst, nach Flächen-Nähe
```
URL-Parameter: `nutzung` (mehrfach), `ort` (mehrfach), `flaeche_min`, `flaeche_max`, `preis_max`, `verfuegbar_bis` (`YYYY-MM-DD`), `eig` (mehrfach), `sort`. Regeln: Nutzung nur aus `nutzung_enum`; Orte nur aus `bekannteOrte` (exakter Vergleich), Eigenschaften nur aus `bekannteEigenschaften`; Zahlen ganzzahlig 0–100000 (Fläche) bzw. 0–10000 (Preis), sonst `null`; min > max → beide getauscht; Datum nur gültig `YYYY-MM-DD`; unbekannte `sort` → `"neu"`. `filtereObjekte`: alle Kriterien UND-verknüpft; Nutzung/Orte innerhalb ODER; `preisMax` schliesst Objekte ohne Preis **nicht** aus („Preis auf Anfrage“); `verfuegbarBis` = verfügbar spätestens an diesem Tag; Eigenschaften: jeder gewählte Schlüssel hat truthy Wert. Sortierung: neu = `created_at` absteigend, flaeche = aufsteigend, preis = aufsteigend mit `null` am Ende.

Tests (mindestens): `<script>` als `ort`/`nutzung`/`sort` wird ignoriert; Zahl `"abc"`, `"-5"`, `"1e9"` → null; min/max-Tausch; Mehrfachwerte als Array und einzeln; jede Filterart einzeln; Preis-null-Regel; Sortierungen inkl. null-Preis am Ende; `filterZuSuchparametern` rundet mit `leseFilter` zurück; `eigenschaftsSchluessel` ignoriert `false`/`0`; `aehnlicheObjekte` ohne sich selbst, max.

`lib/formular-schutz.ts`
```ts
export const MINDESTZEIT_MS = 3000
export const LIMIT_PRO_STUNDE = 5
export function erstelleZeitToken(jetztMs: number, geheimnis: string): string          // `${ms}.${hmacHex}`
export function pruefeZeitToken(token: string, jetztMs: number, geheimnis: string): "ok" | "zu_schnell" | "ungueltig" // ungültig auch bei > 24 h alt oder in der Zukunft
export function hashIp(ip: string, geheimnis: string): string                           // HMAC-SHA256 hex
export function stundenFenster(jetztMs: number): string                                 // ISO der vollen Stunde (UTC)
export function clientIp(kopf: { get(name: string): string | null }): string            // erstes x-forwarded-for, sonst x-real-ip, sonst "unbekannt"
```
HMAC mit `node:crypto` (`createHmac`, Vergleich mit `timingSafeEqual`). Tests: gültig nach 3,1 s; zu schnell bei 2,9 s; manipulierte Zeit/Signatur → ungueltig; falsches Geheimnis → ungueltig; > 24 h → ungueltig; Hash deterministisch und abhängig vom Geheimnis; Fenster auf volle Stunde; IP-Parsing mit Leerzeichen/Listen.

`lib/website-eintrag.ts`
```ts
export const objektanfrageSchema // zod: firma (1–120), name (1–120), email (email, ≤ 200), telefon (optional, ≤ 40, nur Ziffern/+/Leerzeichen/()-/), nachricht (1–2000), objektId (uuid); alle Strings getrimmt
export type Objektanfrage = z.infer<typeof objektanfrageSchema>
export function objektanfrageNachricht(a: Objektanfrage, objektTitel: string, an: string): NachrichtEinfuegen
//   richtung 'eingang', typ 'anfrage', quelle 'website', kategorie 'objektanfrage', ki_status 'fertig', gelesen false,
//   von = email (klein), an, betreff = `Objektanfrage: ${objektTitel}`, body = lesbarer Text aller Felder,
//   objekt_id, erkannte_felder = { firma, name, email, telefon, nachricht } (Json)
export function objektanfrageEntwurf(a: Objektanfrage, objektTitel: string): { betreff: string; body: string }
//   Vorlage: „Guten Tag {name}“, Dank für das Interesse an „{titel}“, Angebot für Besichtigung/Unterlagen, Rückfrage nach Wunschtermin, Signatur „Freundliche Grüsse\nimmoheart“; betreff `Re: Objektanfrage: ${titel}`
```
Tests: Schema lehnt ungültige E-Mail, zu lange Nachricht, Telefon mit Buchstaben ab; trimmt; Nachricht enthält alle Felder und keine HTML-Interpretation nötig (reiner Text); Entwurf enthält Name und Titel, keine Platzhalter wie `{`.

- [ ] RED → GREEN; `npm run lint && npx tsc --noEmit && npm run test`; Commit `feat: Objektsuche, Formularschutz und Website-Eintrag als reine Logik`.

---

### Task 3: Öffentliche Action „Objekt anfragen“ + Limits

**Files:** `lib/queries/formular-limits.ts`, `lib/queries/oeffentlich.ts` (nur `holeOeffentlichesObjekt`), `app/actions/objektanfrage.ts`, `app/actions/passwort.ts`

- `lib/queries/formular-limits.ts` (server-only, Admin-Client): `zaehleEinsendung(ipHash: string, fenster: string): Promise<number>` über `rpc("formular_zaehlen", …)`.
- Geheimnis für Token und IP-Hash: `formularGeheimnis()` = HMAC-Ableitung aus `SUPABASE_SERVICE_ROLE_KEY` mit festem Kontext `"immoheart-formular-v1"` (keine neue Umgebungsvariable; wirft, wenn der Key fehlt). Nur serverseitig.
- `app/actions/objektanfrage.ts` (`"use server"`):
  - `zeitTokenHolen(): Promise<string>` — für das Formular beim Rendern (Server Component ruft `erstelleZeitToken` direkt; die Action ist nur nötig, falls das Formular clientseitig neu startet).
  - `objektAnfragen(eingabe: unknown): Promise<{ ok: true } | { ok: false; fehler: string; feldFehler?: Record<string, string> }>`
    1. Honeypot-Feld `webseite` nicht leer → **so tun als ob ok** (`{ ok: true }`), nichts speichern.
    2. Zeit-Token prüfen: `zu_schnell`/`ungueltig` → Fehler „Bitte versuchen Sie es in ein paar Sekunden erneut.“
    3. zod → Feldfehler.
    4. Limit: `zaehleEinsendung(hashIp(clientIp(headers())), stundenFenster(now))` > 5 → Fehler „Zu viele Anfragen. Bitte später erneut versuchen.“
    5. Objekt über `holeOeffentlichesObjekt(id)` (Server-Client, nur gelistete) — nicht gefunden → Fehler „Dieses Objekt ist nicht mehr verfügbar.“
    6. Speichern mit Admin-Client: Nachricht (`objektanfrageNachricht`, `an = GMAIL_USER`) und Entwurf (`richtung 'entwurf'`, `typ 'antwort'`, `an = email`, `von = GMAIL_USER`, `antwort_auf = nachricht.id`, `objekt_id`). Schlägt der Entwurf fehl, bleibt die Nachricht (Eintrag ist wichtiger).
    7. `revalidatePath("/admin/postfach")`, `revalidatePath("/admin", "layout")`.
  - Keine Mail, keine KI.
- `passwortVergessen`: vor `after()` dasselbe Limit (eigener Kontext im Hash, z. B. `hashIp("pw:" + ip, …)`), bei Überschreitung still zurückkehren (kein Hinweis, ob die Adresse existiert).
- Checks; Commit `feat: oeffentliche Objektanfrage mit Honeypot, Mindestzeit und Limit; Limit fuer Passwort vergessen`.

---

### Task 4: Fotos im Admin

**Files:** `lib/queries/fotos.ts`, `app/actions/fotos.ts`, `components/objekte/*`, `app/actions/objekte.ts`, `lib/queries/objekte.ts`

- `lib/queries/fotos.ts` (server-only, Admin-Client für Storage, Zeilen ebenfalls über Admin-Client nach Login-Prüfung im Aufrufer):
  - `holeFotos(objektId): Promise<{ id; pfad; reihenfolge; url }[]>` (url = `getPublicUrl`)
  - `holeTitelbilder(objektIds: string[]): Promise<Record<string, string>>` (erstes Foto je Objekt)
  - `erstelleUploadZiel(objektId, dateiname, mime): Promise<{ pfad; token; signedUrl }>` — Pfad `${objektId}/${randomUUID()}.${endung}` (Endung aus MIME, nie aus Nutzereingabe), `createSignedUploadUrl`.
  - `registriereFoto(objektId, pfad)`: prüft, dass die Datei im Bucket existiert (`list` im Ordner) und Pfad mit `${objektId}/` beginnt; `reihenfolge` = max + 1.
  - `setzeReihenfolge(objektId, ids: string[])`, `loescheFoto(id)` (Zeile + Datei).
  - `kopiereAusMailAnhang(anhangId, objektId)`: Anhang-Zeile lesen, nur `image/jpeg|png|webp` (HEIC/PDF → NutzerFehler „Dieses Format kann nicht als Objektfoto verwendet werden.“), ≤ 5 MB, `download` aus `mail-anhaenge`, `upload` nach `objekt-fotos`, Zeile hinten anreihen.
- `app/actions/fotos.ts`: `uploadVorbereiten(objektId, mime, groesse)` (validiert MIME/Grösse, gibt `{ fehler, ziel }`), `fotoRegistrieren(objektId, pfad)`, `fotosSortieren(objektId, ids)`, `fotoLoeschen(id)`, `alsObjektfotoUebernehmen(anhangId, objektId)`; alle mit `holeEigenesProfil()` zuerst, zod-uuids, `{ fehler }`-Ergebnisse, revalidate `/admin/objekte` und `/objekte`.
- Client-Upload: `supabase.storage.from("objekt-fotos").uploadToSignedUrl(pfad, token, datei)` mit dem Browser-Client (`erstelleBrowserClient`), danach `fotoRegistrieren`. Mehrere Dateien nacheinander, Fortschritt „2/5 hochgeladen“, Fehler je Datei als Toast.
- Objekt-Formular (Drawer): neue Abschnitte „Beschreibung“ (Textarea, ≤ 4000 Zeichen), Schalter „Auf Website sichtbar“ (`oeffentlich`), „Fotos“ (nur im Bearbeiten-Modus; beim Anlegen Hinweis „Fotos nach dem Speichern hinzufügen“): Raster der Fotos, erstes mit Badge „Titelbild“, Umordnen per Drag & Drop (natives HTML5-DnD) **und** Pfeil-Knöpfe (Tastatur), Löschen mit Bestätigung, „Fotos hinzufügen“ (multiple, `accept="image/jpeg,image/png,image/webp"`). Das alte Feld „Foto-URL“ entfällt im Formular (Spalte bleibt als Fallback).
- Objekt-Raster und Match-Karte: Titelbild = erstes Foto, sonst `foto_url`, sonst Platzhalter. Karte zeigt „N Direktanfragen“ (Anzahl `nachrichten` mit `kategorie = 'objektanfrage'` und `objekt_id`) und ein Auge-durchgestrichen-Symbol, wenn nicht öffentlich.
- Dateien < 200 Zeilen: Fotos-Verwaltung als eigene Komponente(n) (`ObjektFotos.tsx`, `FotoKachel.tsx`, `useFotoUpload.ts`).
- Checks; Commit `feat: Objektfotos hochladen, sortieren, loeschen; Beschreibung und Sichtbarkeit`.

---

### Task 5: Postfach — Objektfoto übernehmen, Anhang löschen, Objektanfrage

**Files:** `components/postfach/AnhangGalerie.tsx` (+ neue Teilkomponente), `app/actions/postfach.ts` oder neue Datei, `lib/postfach.ts` (+Test), `components/postfach/Aktionen*.tsx`, `app/actions/nachrichten.ts`

- Anhang-Galerie: je Bild (nur jpeg/png/webp) „Als Objektfoto übernehmen“ → kleiner Dialog mit Objekt-Auswahl (alle Objekte, Titel + Ort; das verknüpfte `objekt_id` der Mail vorausgewählt) → `alsObjektfotoUebernehmen`; Erfolg-Toast mit Link „Objekt öffnen“. HEIC-Bilder: Knopf deaktiviert mit Hinweis „HEIC bitte als JPG speichern“.
- „Anhang löschen“ je Anhang mit Bestätigung: Action `anhangLoeschen(anhangId)` (Login, Datei + Zeile löschen).
- `lib/postfach.ts`: `KategorieChip` und `aktionsBlock` um `objektanfrage` erweitern (Chip „Objektanfrage“); Tests anpassen/ergänzen.
- Aktionsblock Objektanfrage: zeigt Firma, Name, E-Mail, Telefon, Nachricht (aus `erkannte_felder`), Link zum Objekt (`/admin/objekte`), „Entwurf öffnen“, „Als Anfrage speichern“.
- `alsAnfrageSpeichern` für `kategorie = 'objektanfrage'`: Felder aus dem verknüpften Objekt ableiten (`ort`, `nutzung`, `flaeche_min = flaeche_max = objekt.flaeche`), Firma aus `erkannte_felder.firma` + `kontakt_name` = name + `kontakt_email` = email (bestehende Firma per E-Mail wiederverwenden), Anfrage mit `quelle = 'website'`, `objekt_id`; Entwürfe mit `antwort_auf` bekommen die `anfrage_id` (wie N4). Bestehende Wege für `suchanfrage` bleiben unverändert (Mail-Anfragen `quelle = 'mail'`).
- Checks; Commit `feat: Mail-Bild als Objektfoto, Anhang loeschen, Objektanfragen im Postfach`.

---

### Task 6: Öffentliche Objektliste `/objekte`

**Files:** `lib/queries/oeffentlich.ts`, `app/(public)/objekte/page.tsx`, `components/public/objekte/*`, `components/public/SiteHeader.tsx`, `components/shadcn/{slider,checkbox}.tsx` (aus radix-ui, shadcn-Stil)

- `holeOeffentlicheObjekte(): Promise<OeffentlichesObjekt[]>` — `objekte_oeffentlich` + Titelbilder aus `objekt_fotos` (Server-Client; öffentliche URL über `getPublicUrl` des Buckets), `holeOeffentlichesObjekt(id)`, `holeOeffentlicheFotos(id)`.
- Seite (Server Component, `searchParams`): lädt alle, leitet `bekannteOrte`/`eigenschaftsSchluessel` ab, `leseFilter`, `filtereObjekte`; zeigt Trefferzahl („12 Objekte“), Sortierung, „Filter zurücksetzen“ (Link `/objekte`), Karten-Raster (Titelbild oder Platzhalter mit Herz, Titel, Ort, Fläche, Preis/m² oder „Preis auf Anfrage“, Nutzung, Badge „reserviert“). Leerer Zustand mit Hinweis und Link zum Suchauftrag (`/suchauftrag`, Seite folgt in N6 — Link bleibt).
- Filter-Oberfläche (Client): Nutzung (Checkboxen), Ort (Checkboxen), Fläche von–bis (Slider mit zwei Griffen, Bereich aus Min/Max der Objekte), Preis/m² max (Zahlenfeld), verfügbar bis (Datum), Eigenschaften (Checkboxen, Label aus Schlüssel: `_` → Leerzeichen, erster Buchstabe gross). Änderungen schreiben per `router.replace` die URL (`filterZuSuchparametern`), debounced für Slider/Zahl. Desktop: Seitenleiste; Handy: Knopf „Filter (n)“ öffnet shadcn-`Sheet`.
- Metadaten: `title: "Objekte · immoheart"`, `description`.
- Header: Navigationslink „Objekte“ (weitere Links folgen in N6).
- Checks; Commit `feat: oeffentliche Objektliste mit Filtern in der URL`.

---

### Task 7: Öffentliche Detailseite `/objekte/[id]`

**Files:** `app/(public)/objekte/[id]/page.tsx`, `components/public/objekte/{Galerie,Eckdaten,AnfrageFormular,AehnlicheObjekte}.tsx`

- `id` per zod als uuid prüfen, sonst `notFound()`; Objekt nur über `holeOeffentlichesObjekt` (nicht gelistet → `notFound()`).
- Galerie: Titelbild gross, Vorschaubilder, Vollbild im shadcn-`Dialog` mit Pfeiltasten; ohne Fotos Platzhalter.
- Eckdaten (Fläche, Preis/m² oder „auf Anfrage“, Nutzung, verfügbar ab, Ort), Badge „reserviert“, Beschreibung (`whitespace-pre-line`), Eigenschaften-Chips.
- Karte: `<iframe>` Google-Maps-Embed nur mit dem **Ortsnamen** (`https://www.google.com/maps?q=${encodeURIComponent(ort + ", Schweiz")}&output=embed`), `loading="lazy"`, `referrerPolicy="no-referrer"`, Titel-Attribut.
- Formular „Objekt anfragen“ (Client): Firma, Name, E-Mail, Telefon (optional), Nachricht (vorbelegt „Ich interessiere mich für …“), verstecktes Honeypot-Feld `webseite` (visuell und für Screenreader versteckt, `tabIndex={-1}`, `autoComplete="off"`), verstecktes Zeit-Token (von der Server-Seite mit `erstelleZeitToken(Date.now(), formularGeheimnis())` übergeben). Senden → `objektAnfragen`; Feldfehler am Feld, allgemeiner Fehler oben; Eingaben bleiben erhalten; Erfolg → Danke-Zustand („Danke! Wir melden uns innerhalb von 1–2 Werktagen.“), kein erneutes Absenden ohne Neuladen.
- Ähnliche Objekte (max. 3) als Karten.
- Metadaten mit Titel und Ort (nie Adresse); Open-Graph-Bild = Titelbild.
- Checks; Commit `feat: oeffentliche Objekt-Detailseite mit Galerie, Karte und Anfrageformular`.

---

### Task 8: Gesamtprüfung, Push

- `npm run lint && npx tsc --noEmit && npm run test && npm run build && npm audit --omit=dev`.
- `grep -rn "adresse\|eigentuemer" "app/(public)" components/public lib/queries/oeffentlich.ts` → keine Treffer.
- `grep -rn "erstelleAdminClient" "app/(public)" components/public lib/queries/oeffentlich.ts` → keine Treffer.
- `grep -rn "dangerouslySetInnerHTML" app components` → leer.
- Push.

### Task 9: Live-Test (Controller + Davide), Merge

- Ohne Login (Controller, eigener Chrome-Tab ohne Session bzw. Inkognito nicht nötig: öffentliche Seiten brauchen keinen Login): `/objekte` lädt, Filter per Klick und per URL; manipulierter Link `/objekte?ort=<script>alert(1)</script>&flaeche_min=abc&sort=x` zeigt normale Seite ohne Ausgabe des Rohwerts. Quelltext/RSC-Payload der Liste und des Details enthält keine Adresse/keinen Eigentümer (per `fetch` der Seite und Suche nach der bekannten Test-Adresse).
- Admin (Davide eingeloggt): „[TEST]“-Objekt mit Beschreibung anlegen, 2 Fotos hochladen, umsortieren, eines löschen; Sichtbarkeit aus → verschwindet aus `/objekte`, an → erscheint.
- Davide sendet eine Mail mit Foto → im Postfach „Als Objektfoto übernehmen“ zum [TEST]-Objekt → erscheint öffentlich in der Galerie.
- Detailseite: „Objekt anfragen“ ausfüllen (Controller, Testdaten mit `immoheart.business+n5@gmail.com`) → Danke; Honeypot-Test (per DevTools gefüllt → Danke, aber kein Eintrag); zu schnelles Absenden → Meldung; im Postfach erscheint der Website-Eintrag mit Entwurf, „Als Anfrage speichern“ → Anfrage mit `quelle = website` und `objekt_id`; Objektkarte zeigt „1 Direktanfrage“.
- Limit: 6. Einsendung innerhalb der Stunde → Meldung (per Skript gegen die Action ist nicht nötig; über die Oberfläche mit gültigem Token nach je 3 s).
- Aufräumen: [TEST]-Objekt (Fotos, Bucket-Dateien), Website-Eingänge soft-deleten, Entwürfe, Anfrage, Firma, `formular_limits`-Zeilen der Tests. Davides OK → Merge.

## Abnahme N5

- Ein Mail-Bild wird als Objektfoto übernommen und erscheint öffentlich.
- Besucher filtert (auch per Link), öffnet ein Objekt und fragt an; Eintrag und Entwurf erscheinen im Admin; „Als Anfrage speichern“ verknüpft Objekt und Quelle.
- Öffentlich nirgends Adresse oder Eigentümer; manipulierte Filter-Links sind harmlos.
- Formulare mit Honeypot, Mindestzeit und Limit; „Passwort vergessen“ ebenfalls limitiert.
- Kein neuer automatischer Versandpfad, keine KI-Aufrufe durch Besucher.
