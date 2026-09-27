# Relaunch N4 · Gmail-Eingang, KI-Einordnung, neues Postfach — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mails an `immoheart.business@gmail.com` werden automatisch abgeholt, solange ein Admin-Tab offen und sichtbar ist, samt Bild-/PDF-Anhängen gespeichert, von der KI eingeordnet (Suchanfrage, Antwort, Objektangebot, Sonstiges) und im neuen Postfach mit passenden Aktionen angezeigt. Nichts wird automatisch gesendet — Reaktionen sind Entwürfe.

**Architecture:** Zwei getrennte Schritte, damit ein Lauf die 60-s-Grenze nie reisst:
1. **Abruf** (`mailAbrufen`): höchstens 5 ungelesene Mails per IMAP holen, Rohdaten + erlaubte Anhänge speichern (`ki_status = 'offen'`), dann in Gmail als gelesen markieren. Eine Sperrzeile `mail_abruf` lässt höchstens einen Lauf pro 60 s zu.
2. **Verarbeitung** (`verarbeiteNaechste`): nimmt genau eine `offen`-Mail atomar in Arbeit (`laeuft`), ordnet sie zu (erst deterministisch über Mail-Header, dann KI) und legt Entwürfe an. Der Client ruft das so lange auf, bis nichts mehr offen ist.
Ein unsichtbarer Client-Baustein im Admin-Layout (`MailAbrufer`) stösst beides alle 2 Minuten an, nur bei sichtbarem Tab.

**Tech Stack:** Next.js 15.5, Supabase (Postgres + privater Storage-Bucket), imapflow 2.0.8, mailparser 3.9.28 (+ @types/mailparser 3.4.6), Gemini über `lib/ki/gemini.ts`, zod 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-26-relaunch-design.md` (Abschnitt 2 „Abruf“, „Ablauf pro Lauf“, „Anhänge“, „KI-Einordnung“; 3 „/admin/postfach“; 5 Migrationen/Sicherheit). Abruf-Auslöser gemäss Davides Vorgabe: **nur bei offenem Admin-Bereich**, kein Cron.

## Global Constraints

- Alle Regeln aus N1–N3 (Namen, kein `any`, < 200 Zeilen je Datei, `lib/queries/` für Datenzugriff, Server Actions, Kommentare nur für das *Warum*).
- **Nichts wird automatisch gesendet.** KI-Reaktionen sind ausschliesslich Entwürfe (`richtung = 'entwurf'`); Versand nur über den bestehenden Editor.
- Mail-HTML wird **nie** als HTML dargestellt; gespeichert und angezeigt wird Text.
- Rohtext wird **immer zuerst** gespeichert, erst danach die Mail in Gmail als gelesen markiert; KI-Fehler lassen die Mail mit `ki_status = 'fehler'` und „erneut verarbeiten“ stehen.
- Anhänge: nur `image/jpeg|png|webp|heic|heif` und `application/pdf`, je ≤ 10 MB, im **privaten** Bucket `mail-anhaenge`, Zugriff nur über serverseitig erzeugte, kurzlebige signierte URLs nach Login-Prüfung. Andere Dateien: nur der Name.
- Jede Server Action prüft zuerst `holeEigenesProfil()`; erwartete Fehler als `NutzerFehler` → `{ fehler }` (Muster aus N3, `lib/nutzer-fehler.ts`); unerwartete werfen.
- Neue Tabellen: RLS an, Policy „aktives konto …“, zusätzlich `revoke all … from anon`.
- Pakete exakt pinnen, `npm audit --omit=dev` ohne high/critical.
- Testmails nur an `immoheart.business+<x>@gmail.com` oder von/an `davide.nocito28@yahoo.com`.
- Commits enden mit Leerzeile und exakt:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01CbSKvzEHCKZUWFsZgFgstd`
- Branch `feature/n4-eingang`, Worktree `.worktrees/n4`. Blockierte Befehle: BLOCKED melden.

## Dateiübersicht

| Datei | Aktion | Zweck |
|---|---|---|
| `supabase/migrations/20260927300000_n4_eingang.sql` | neu | Spalten, `nachricht_anhaenge`, `mail_abruf`, Bucket |
| `lib/mail/eingang.ts`, `.test.ts` | neu | reine Helfer: Text aus HTML, Anhang-Regeln, Dateiname, Referenzen |
| `lib/ki/einordnung.ts`, `.test.ts` | neu | Prompt + Parse der Einordnung (Kategorie, Suchfelder, Objektdaten) |
| `lib/eingang/zuordnung.ts`, `.test.ts` | neu | reine Zuordnung einer Antwort zu einer Anfrage |
| `lib/mail/abruf.ts` | neu | IMAP-Abruf (server-only) |
| `lib/queries/eingang.ts` | neu | Speichern, Sperre, Anhänge, Verarbeitungs-Claim |
| `app/actions/eingang.ts` | neu | `mailAbrufen`, `verarbeiteNaechste`, `erneutVerarbeiten`, `kategorieAendern`, `anfrageZuordnen`, `feldUebernehmen`, `alsGelesenMarkieren`, `anhangLink` |
| `lib/eingang/verarbeitung.ts` | neu | Reaktion je Kategorie (server-only) |
| `lib/ki/entwuerfe.ts` (+Test) | ändern | `entwurfAntwort`, `entwurfObjektangebot` |
| `app/actions/nachrichten.ts` | ändern | `alsAnfrageSpeichern` neu (Eingang bleibt, Firma, Verknüpfung); `nachrichtEingegangen` entfernen |
| `components/postfach/*` | umbauen | neue Liste/Details, Anhänge, Abruf-Status; `MailEinfuegen.tsx` löschen |
| `components/layout/MailAbrufer.tsx`, `app/admin/layout.tsx`, `Sidebar.tsx` | neu/ändern | Polling, Badge „ungelesen“ |
| `components/objekte/*`, `app/admin/objekte/page.tsx` | ändern | „Als Objekt übernehmen“ (Formular vorbelegt) |

---

### Task 1: Pakete, Migration, Bucket

**Files:** `package.json`, `package-lock.json`, `supabase/migrations/20260927300000_n4_eingang.sql`; `types/database.ts` (Controller)

- [ ] **Step 1: Pakete**

```bash
npm install --save-exact imapflow@2.0.8 mailparser@3.9.28
npm install --save-dev --save-exact @types/mailparser@3.4.6
npm audit --omit=dev
```

- [ ] **Step 2: Migration**

```sql
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
```

- [ ] **Step 3:** Commit (Implementer); **Controller** spielt ein (`apply_migration` `n4_eingang`), prüft Bucket (`select id, public from storage.buckets`), erzeugt Typen, committet sie.

```bash
git add package.json package-lock.json supabase/migrations/20260927300000_n4_eingang.sql
git commit -m "feat(db): Eingang, Anhaenge, Abruf-Sperre und privater Bucket fuer N4"
```

---

### Task 2: Reine Helfer und KI-Einordnung (TDD)

**Files:** `lib/mail/eingang.ts`, `lib/mail/eingang.test.ts`, `lib/ki/einordnung.ts`, `lib/ki/einordnung.test.ts`

**Interfaces (Produces):**
- `htmlZuText(html: string): string` — entfernt `<script>`/`<style>`-Blöcke samt Inhalt, ersetzt `<br>`/`</p>`/`</div>`/`</li>` durch Zeilenumbruch, entfernt alle übrigen Tags, dekodiert `&amp; &lt; &gt; &quot; &#39; &nbsp;`, fasst ≥3 Leerzeilen zu 2 zusammen, trimmt.
- `const ERLAUBTE_ANHANG_TYPEN: readonly string[]`, `const MAX_ANHANG_BYTES = 10 * 1024 * 1024`, `anhangErlaubt(mime: string, groesse: number): boolean` (Typ klein geschrieben verglichen).
- `sichererDateiname(name: string | undefined, index: number): string` — nur `[a-zA-Z0-9._-]`, andere Zeichen → `_`, max. 80 Zeichen, leer/undefined → `anhang-<index>`; Endung bleibt erhalten.
- `referenzListe(inReplyTo: string | undefined, references: string | string[] | undefined): string[]` — alle `<…>`-IDs aus beiden Headern, ohne Duplikate, Reihenfolge wie im Header.
- `absender(from: { value: { address?: string; name?: string }[] } | undefined): { adresse: string; name: string | null } | null` — erste Adresse klein geschrieben.
- `lib/ki/einordnung.ts`: `type Kategorie = "suchanfrage" | "antwort" | "objektangebot" | "sonstiges"`; `type ObjektDaten = { titel: string | null; adresse: string | null; ort: string | null; flaeche: number | null; preis_pro_m2: number | null; nutzung: Nutzung | null; verfuegbar_ab: string | null; beschreibung: string | null }`; `type Einordnung = { kategorie: Kategorie; felder: ErkannteFelder; objekt: ObjektDaten }`; `baueEinordnungsPrompt(betreff: string, text: string): string`; `parseEinordnung(antwort: string): Einordnung` (Codeblock-Zäune entfernen wie `parseErkennungsAntwort`; unbekannte Kategorie → `"sonstiges"`; Felder mit falschem Typ → `null`; `verfuegbar_ab` nur `YYYY-MM-DD`, sonst `null`); `ordneEin(betreff: string, text: string): Promise<Einordnung>` (über `generiereText`).

- [ ] **Step 1: Tests schreiben** — mindestens:
  - `htmlZuText`: Script/Style entfernt (`<script>alert(1)</script>Hallo` → `Hallo`), `<p>A</p><p>B</p>` → `A\nB`, Entities dekodiert, keine Tags übrig.
  - `anhangErlaubt`: jpeg 1 MB true, `IMAGE/PNG` true, pdf 10 MB true, pdf 10 MB + 1 false, `application/zip` false.
  - `sichererDateiname`: `"../../etc/passwd"` → keine `/` und kein `..`-Pfad (`".._.._etc_passwd"` o. ä.), `"Grundriss 1.pdf"` → `"Grundriss_1.pdf"`, `undefined, 2` → `"anhang-2"`, 200 Zeichen → ≤ 80 mit Endung.
  - `referenzListe`: kombiniert, dedupliziert, akzeptiert String mit mehreren IDs und Array.
  - `absender`: normal, fehlend → null.
  - `parseEinordnung`: gültiges JSON mit Codeblock, unbekannte Kategorie → sonstiges, falsche Typen → null, ungültiges Datum → null, kaputtes JSON → wirft.
  - `baueEinordnungsPrompt`: enthält Betreff, Text und alle vier Kategorien.
- [ ] **Step 2:** RED. **Step 3:** Implementieren. Der Prompt beschreibt die vier Kategorien in je einem Satz („suchanfrage: jemand sucht eine Gewerbefläche“, „antwort: Antwort auf eine frühere Mail von immoheart“, „objektangebot: ein Eigentümer bietet eine Fläche zur Vermittlung an“, „sonstiges: Werbung, Newsletter, Spam, Unklares“) und verlangt ausschliesslich JSON im Format `{"kategorie": …, "felder": {…ErkannteFelder…}, "objekt": {…ObjektDaten…}}` (nicht zutreffende Teile mit `null`-Werten). **Step 4:** GREEN; `npm run lint && npx tsc --noEmit && npm run test`. **Step 5:** Commit `feat: Eingangs-Helfer und KI-Einordnung`.

---

### Task 3: IMAP-Abruf und Speichern

**Files:** `lib/mail/abruf.ts`, `lib/queries/eingang.ts`, `app/actions/eingang.ts` (nur `mailAbrufen`)

**Interfaces:**
- `lib/queries/eingang.ts` (server-only, **Admin-Client**, weil der Abruf auch Storage schreibt; Aufrufer prüfen vorher den Login):
  - `sperreAbruf(): Promise<boolean>` — `update mail_abruf set letzter_start = now() where id = 1 and (letzter_start is null or letzter_start < now() - 60 s)`, `select id`, true wenn eine Zeile.
  - `abrufErfolg(): Promise<void>`, `abrufFehler(text: string): Promise<void>`, `holeAbrufStatus(): Promise<{ letzterErfolg: string | null; letzterFehler: string | null; letzterFehlerAm: string | null }>`
  - `speichereEingang(e: { message_id: string | null; in_reply_to: string | null; referenzen: string | null; von: string; betreff: string; body: string; empfangen_am: string | null; anhaenge: string[] }): Promise<{ id: string } | null>` — `richtung 'eingang'`, `typ 'anfrage'`, `quelle 'mail'`, `ki_status 'offen'`, `an = GMAIL_USER`; bei bestehender `message_id` (Unique-Verletzung `23505`) → `null` (Duplikat, nicht erneut).
  - `speichereAnhang(nachrichtId: string, a: { dateiname: string; mime: string; inhalt: Buffer; index: number }): Promise<void>` — Upload nach `${nachrichtId}/${index}-${dateiname}` in `mail-anhaenge` (`contentType`, `upsert: false`), dann Zeile in `nachricht_anhaenge`.
- `lib/mail/abruf.ts` (server-only): `holeNeueMails(max: number): Promise<{ gespeichert: number; duplikate: number }>`
  - `new ImapFlow({ host: "imap.gmail.com", port: 993, secure: true, auth: { user, pass }, logger: false })`, `connect`, `getMailboxLock("INBOX")`, `search({ seen: false }, { uid: true })`, aufsteigend sortieren, die ersten `max` UIDs.
  - Pro UID: `fetchOne(uid, { source: true }, { uid: true })` → `simpleParser(source)`; Text = `parsed.text ?? htmlZuText(parsed.html || "")`, auf 50 000 Zeichen kürzen; Betreff Fallback „(ohne Betreff)“; `absender(parsed.from)` fehlt → Adresse `"unbekannt"`.
  - Anhänge: erlaubte (`anhangErlaubt(contentType, size)`) → `speichereAnhang`; andere → Name in `anhaenge`-Liste.
  - **Reihenfolge:** `speichereEingang` → Anhänge → erst dann `messageFlagsAdd(uid, ["\\Seen"], { uid: true })`. Fehler bei einer einzelnen Mail: loggen, Mail **nicht** als gelesen markieren, mit der nächsten weitermachen. Doppelte (`null`): trotzdem als gelesen markieren.
  - `finally`: Lock freigeben, `logout()`.
- `app/actions/eingang.ts` — `mailAbrufen(): Promise<{ neu: number; fehler: string | null }>`: `holeEigenesProfil()`; wenn `!sperreAbruf()` → `{ neu: 0, fehler: null }`; sonst `holeNeueMails(5)`, `abrufErfolg()`, revalidate `/admin/postfach` + Layout; bei Fehler `abrufFehler(kurztext)` und `{ neu: 0, fehler: "Abruf fehlgeschlagen. Details im Postfach." }`.

- [ ] Implementieren; `npm run lint && npx tsc --noEmit && npm run test && npm run build`; Commit `feat: IMAP-Abruf mit Sperre, Rohtext zuerst, Anhaenge im privaten Bucket`.
- [ ] **Controller-Livecheck** (nach Commit): Testmail per SMTP an `immoheart.business+n4a@gmail.com` mit einem kleinen PNG-Anhang schicken, lokal ein Skript `holeNeueMails(5)`-äquivalent ausführen (ohne server-only-Import: gleiche Logik) oder die Action über den Preview auslösen (Task 9); prüfen: Zeile gespeichert, Anhang im Bucket, Mail in Gmail gelesen.

---

### Task 4: Zuordnung, Verarbeitung, KI-Antwortentwürfe

**Files:** `lib/eingang/zuordnung.ts` (+Test), `lib/eingang/verarbeitung.ts`, `lib/ki/entwuerfe.ts` (+Test), `lib/queries/eingang.ts` (Claim), `app/actions/eingang.ts`

**Interfaces:**
- `findeAnfrageFuerAntwort(p: { referenzen: string[]; gesendete: { message_id: string; anfrage_id: string | null }[]; absender: string; offeneNachAbsender: Record<string, string[]> }): { anfrageId: string; grund: "verlauf" | "absender" } | null` — zuerst jede Referenz gegen `gesendete` (neueste zuerst gewinnt: letzte Referenz, die trifft); sonst genau **eine** offene Anfrage zur Absenderadresse; bei mehreren oder keiner → null. Tests: Verlaufstreffer, Absendertreffer, mehrdeutig → null, nichts → null, Verlauf schlägt Absender.
- `lib/ki/entwuerfe.ts`: `baueAntwortPrompt(p: { eingangBetreff: string; eingangText: string; anfrageKurz: string | null }): string`, `entwurfAntwort(...)`; `baueObjektangebotPrompt(p: { betreff: string; text: string; hatBilder: boolean }): string`, `entwurfObjektangebot(...)` — ohne Bilder muss der Prompt verlangen, freundlich um Fotos als Anhang zu bitten. Tests: Prompt enthält jeweils Betreff und die Foto-Bitte nur bei `hatBilder: false`.
- `lib/queries/eingang.ts`: `claimNaechsteOffene(): Promise<NachrichtRow | null>` — nimmt die älteste Zeile mit `ki_status = 'offen'` **oder** `ki_status = 'laeuft' and ki_gestartet_am < now() - 2 min`; bedingtes Update auf `laeuft` + `ki_gestartet_am = now()` mit derselben Bedingung plus `id`, gibt die Zeile nur zurück, wenn das Update traf (zwei gleichzeitige Aufrufer bekommen nie dieselbe Zeile). `setzeKiErgebnis(id, felder)`, `setzeKiFehler(id, text)`, `holeGesendeteMitAnfrage()`, `holeOffeneAnfragenNachAbsender()`.
- `lib/eingang/verarbeitung.ts` (server-only): `verarbeite(nachricht: NachrichtRow, erzwungeneKategorie?: Kategorie): Promise<void>`:
  1. Referenzen aus `in_reply_to`/`referenzen`; `findeAnfrageFuerAntwort` mit Verlauf **vor** der KI: Treffer über `grund: "verlauf"` → Kategorie `antwort` fest (KI nur noch für Felder).
  2. Sonst `ordneEin(betreff, body)` (bzw. `erzwungeneKategorie`).
  3. Je Kategorie:
     - `suchanfrage`: `erkannte_felder = felder`; Lücken (irgendein Feld `null`) → Rückfrage-Entwurf (`entwurfRueckfrage`), `betreff = antwortBetreff(eingang.betreff)`, `antwort_auf = eingang.id`, `an = eingang.von`.
     - `antwort`: Zuordnung (Verlauf, sonst Absender) → `anfrage_id` setzen, `aktualisiereAnfrage(letzter_kontakt = now())`; `erkannte_felder = felder` (für Vorschläge); Antwort-Entwurf (`entwurfAntwort`) mit `anfrage_id`, `antwort_auf`, „Re:“-Betreff. Ohne Zuordnung: nur einordnen, kein Entwurf (Postfach bietet „Anfrage zuordnen“).
     - `objektangebot`: `erkannte_felder = { objekt }`; Entwurf `entwurfObjektangebot` mit `hatBilder` = es gibt Bild-Anhänge.
     - `sonstiges`: nichts.
  4. `ki_status = 'fertig'`, `kategorie` setzen. Jeder Fehler → `setzeKiFehler(id, kurztext)`; Entwürfe erst anlegen, wenn Einordnung+Felder gespeichert sind (kein halber Zustand ohne Status).
- `app/actions/eingang.ts`: `verarbeiteNaechste(): Promise<{ verarbeitet: boolean; fehler: string | null }>` (Login; `claimNaechsteOffene`; `verarbeite`; revalidate), `erneutVerarbeiten(id)` (nur `ki_status in (fehler, fertig)`, setzt auf `offen`, löscht **keine** bestehenden Entwürfe, dann `verarbeiteNaechste`-gleiche Logik für genau diese id), `kategorieAendern(id, kategorie)` (setzt `kategorie`, dann `verarbeite(n, kategorie)`).

- [ ] TDD für Zuordnung und Prompts; übriges implementieren; alle Checks; Commit `feat: Zuordnung und KI-Verarbeitung eingehender Mails`.

---

### Task 5: Als Anfrage speichern neu, Anfrage zuordnen, Feld übernehmen

**Files:** `app/actions/nachrichten.ts`, `app/actions/eingang.ts`, `lib/queries/anfragen.ts` (Firma suchen/anlegen)

- `alsAnfrageSpeichern(nachrichtId, nutzungUeberschreibung?)` neu:
  - Login prüfen; Eingang laden; muss `kategorie = 'suchanfrage'` oder `null` haben und `anfrage_id is null` sein, sonst NutzerFehler „bereits verarbeitet“.
  - **Eingang bleibt bestehen** (kein Löschen mehr). Doppelklick-Schutz: nach dem Anlegen der Anfrage bedingtes Update `nachrichten set anfrage_id = … where id = … and anfrage_id is null` — trifft es nicht, die eben angelegte Anfrage wieder löschen und NutzerFehler werfen.
  - Firma: vorhandene mit `kontakt_email = eingang.von` (klein) verwenden, sonst neu mit `name = felder.firma ?? eingang.von`, `branche = felder.branche`, `kontakt_email = eingang.von`.
  - Anfrage mit Feldern + `firma_id`; Rückfrage-Entwürfe mit `antwort_auf = eingang.id` bekommen `anfrage_id` (damit Senden `letzter_kontakt` pflegt und Folgemails im Verlauf bleiben).
  - Rematch wie bisher.
- `nachrichtEingegangen` und `loescheUndGibNachrichtZurueck` entfernen (keine Aufrufer mehr), ebenso `components/postfach/MailEinfuegen.tsx` (in Task 6).
- `anfrageZuordnen(nachrichtId, anfrageId)`: setzt `anfrage_id`, `kategorie = 'antwort'`, `letzter_kontakt`.
- `feldUebernehmen(nachrichtId, feld)`: nur für `antwort` mit `anfrage_id`; Feld aus Whitelist (`flaeche_min, flaeche_max, ort, budget_pro_m2, bezug, nutzung`) aus `erkannte_felder` in die Anfrage schreiben über `anfrageAktualisieren` (Rematch läuft dort).
- `alsGelesenMarkieren(id)`.
- Checks; Commit `feat: Eingang bleibt beim Speichern als Anfrage, Firma und Verlauf verknuepft`.

---

### Task 6: Neues Postfach

**Files:** `app/admin/postfach/page.tsx`, `components/postfach/*` (neu aufteilen, je < 200 Zeilen), `app/actions/eingang.ts` (`anhangLinks(nachrichtId)`)

- Liste: Filter **Alle / Eingang / Website / Gesendet**; Chips je Kategorie (Suchanfrage, Antwort, Objektangebot, Sonstiges); ungelesene fett + Punkt; Badge „N Bilder“/„PDF“; Symbol für KI-Status (läuft/fehler).
- Detail Eingang: Von, Betreff, empfangen am; Text (`whitespace-pre-wrap`, nie HTML); Anhänge (Vorschau-Kacheln für Bilder, Klick öffnet shadcn-Dialog mit grossem Bild; je „Download“; PDF als Link) — Links über `anhangLinks` (signierte URLs, 10 Min., nach Login-Prüfung, Admin-Client); Liste nicht gespeicherter Anhänge (nur Namen).
- KI-Bereich: Status „wird eingeordnet…“ / Fehlertext + „Erneut verarbeiten“; Kategorie-Auswahl zum Ändern (mit Bestätigung, da neue Entwürfe entstehen können).
- Aktionen je Kategorie: Suchanfrage → erkannte Felder mit „?“ + „Als Anfrage speichern“ (Nutzungsauswahl wie bisher) + „Rückfrage öffnen“; Antwort → zugeordnete Anfrage (Link) oder „Anfrage zuordnen“ (Auswahl offener Anfragen), neue Angaben mit „Übernehmen“ je Feld, „Antwort-Entwurf öffnen“; Objektangebot → erkannte Objektdaten + „Als Objekt übernehmen“ (Link `/admin/objekte?aus=<id>`) + „Antwort-Entwurf öffnen“; alle → „Antwort entwerfen“ (legt freien Entwurf mit „Re:“ und `antwort_auf` an und öffnet ihn — neue Action `antwortEntwerfen(nachrichtId)` ohne KI).
- Beim Öffnen einer ungelesenen Mail `alsGelesenMarkieren`.
- Kopf: Abruf-Status („Zuletzt abgerufen HH:MM“, Fehler rot mit Zeitpunkt) + Knopf „Jetzt abrufen“ (ruft `mailAbrufen`, dann solange `verarbeiteNaechste` bis `verarbeitet: false`, zeigt Fortschritt „2 eingeordnet…“).
- `MailEinfuegen.tsx` per `git rm` löschen.
- Checks; Commit `feat: neues Postfach mit Kategorien, Anhaengen und Abruf-Status`.

---

### Task 7: Automatischer Abruf, Badge, Objekt übernehmen

**Files:** `components/layout/MailAbrufer.tsx`, `app/admin/layout.tsx`, `components/layout/Sidebar.tsx`, `lib/queries/nachrichten.ts`, `app/admin/objekte/page.tsx`, `components/objekte/ObjekteAnsicht.tsx`, `components/objekte/ObjektFormular.tsx`

- `MailAbrufer` (Client, rendert `null`): beim Mount und alle 120 s, **nur wenn `document.visibilityState === "visible"`** (und beim Wieder-Sichtbarwerden, frühestens 120 s nach dem letzten Lauf): `mailAbrufen()`; danach `verarbeiteNaechste()` in einer Schleife (max. 5 pro Runde) solange `verarbeitet`; wenn etwas neu/verarbeitet → `router.refresh()`. Nie zwei Runden parallel (Ref-Flag). Fehler still (Status steht im Postfach).
- Layout bindet `MailAbrufer` ein; Postfach-Badge = ungelesene Eingänge (`zaehleNachrichten` → `.eq("gelesen", false)`).
- Objekte: `page.tsx` liest `searchParams.aus`; ist es eine Eingangs-uuid mit `kategorie = 'objektangebot'`, wird `ObjektFormular` im Modus „neu“ mit `vorbelegung` aus `erkannte_felder.objekt` geöffnet (Titel, Adresse, Ort, Fläche, Preis, Nutzung, verfügbar ab; Eigentümer = Absendername/-adresse). `ObjektFormular` bekommt optionale Prop `vorbelegung?: Partial<…>` für die Startwerte. Nach dem Speichern setzt die Action `objektAnlegen` optional `herkunftNachrichtId` → `nachrichten.objekt_id`.
- Checks; Commit `feat: automatischer Abruf bei offenem Admin, Badge ungelesen, Objekt aus Mail uebernehmen`.

---

### Task 8: Gesamtprüfung, Push

- `npm run lint && npx tsc --noEmit && npm run test && npm run build && npm audit --omit=dev`.
- `grep -rn "dangerouslySetInnerHTML" app components` → leer.
- `grep -rn "sendeMail(" app lib` → unverändert zu N3 (kein neuer Versandpfad).
- Push.

### Task 9: Live-Test (Controller + Davide), Merge

- Davide eingeloggt auf dem Preview.
- **Suchanfrage mit Lücken** (Davide sendet von Yahoo an `immoheart.business@gmail.com`: „Wir suchen 500 m² Lager in Zuchwil“): innerhalb von ~2 Min im Postfach, Kategorie Suchanfrage, Rückfrage-Entwurf mit „Re:“; „Als Anfrage speichern“ → Anfrage + Firma mit Yahoo-Adresse; Eingang bleibt; Rückfrage hat `anfrage_id`.
- **Antwort im Verlauf:** Rückfrage senden → Davide antwortet in Yahoo mit „Budget 120 CHF/m², Bezug sofort“ → Kategorie Antwort, richtig zugeordnet (Verlauf), `letzter_kontakt` aktualisiert, Vorschläge übernehmbar, Antwort-Entwurf vorhanden.
- **Objektangebot mit Bild:** Davide sendet „Wir möchten unsere Halle in Bettlach (800 m²) vermitteln lassen“ mit einem Foto → Kategorie Objektangebot, Bild als Vorschau + Download, „Als Objekt übernehmen“ öffnet vorbelegtes Formular. Zweite Variante ohne Foto → Entwurf bittet um Fotos.
- **Spam/Sonstiges:** kurze Werbemail → Sonstiges, kein Entwurf.
- **Sperre:** zwei Tabs offen → in `mail_abruf` höchstens ein Start pro 60 s.
- **Tab im Hintergrund:** kein Abruf (Netzwerk/DB-Zeitstempel unverändert).
- **KI-Fehler:** per SQL eine Zeile auf `ki_status='fehler'` setzen → „Erneut verarbeiten“ funktioniert.
- Aufräumen aller Testdaten (Nachrichten, Anhänge inkl. Bucket-Dateien, Anfragen, Firmen, Objekte). Davides OK → Merge.

## Abnahme N4

- Bei offenem, sichtbarem Admin-Tab erscheinen neue Mails innerhalb von ca. 2 Minuten, ohne offenen Tab wird nicht abgerufen.
- Rohtext geht nie verloren; KI-Fehler sind sichtbar und wiederholbar.
- Jede Mail ist eingeordnet; Antworten werden über den Verlauf der richtigen Anfrage zugeordnet.
- Bilder/PDFs sind im Postfach sichtbar und herunterladbar, aber nie öffentlich erreichbar.
- Objektangebote lassen sich als vorbelegtes Objekt übernehmen; ohne Bilder bittet der Entwurf um Fotos.
- Kein neuer automatischer Versandpfad.
