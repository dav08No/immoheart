# immoheart

Interne Webapp zur Vermittlung von Gewerbeimmobilien für die Geschäftsstelle **espaceSOLOTHURN** (Kanton Solothurn).

Anfragen nach Gewerbeflächen treffen unstrukturiert per E-Mail ein und werden heute von Hand in Trello erfasst. Das kostet Zeit, und ältere Anfragen geraten in Vergessenheit — wenn Monate später das passende Objekt frei wird, denkt niemand mehr daran.

immoheart erfasst Anfragen und Objekte strukturiert und gleicht sie **in beide Richtungen** ab: jede neue Anfrage gegen den Objektbestand, und jedes neue Objekt gegen **alle** offenen Anfragen, auch Monate alte. Jeder Vorschlag wird Kriterium für Kriterium begründet. Versendet wird erst nach Freigabe durch einen Menschen.

---

## Stand

Prototyp vorhanden (`docs/puls-cockpit-v5.html`), Umsetzung als Webapp in Arbeit.

---

## Stack

| | |
|---|---|
| Frontend | Next.js (App Router, TypeScript strict) |
| Datenbank & Auth | Supabase (Postgres, RLS) |
| Styling | Tailwind CSS |
| Tests | Vitest — nur für die Matching- und Puls-Logik |

Bewusst keine State-Bibliothek, kein ORM, keine Komponentenbibliothek.

---

## Einrichten

**Voraussetzungen:** Node 20+, Supabase CLI, Zugang zum Supabase-Projekt.

```bash
git clone <repo-url>
cd puls
npm install
cp .env.example .env.local
```

In `.env.local` eintragen:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Der Service-Role-Key gehört **nie** in eine `NEXT_PUBLIC_`-Variable und nie ins Repository.

Datenbank aufsetzen und starten:

```bash
supabase db push        # Migrationen einspielen
supabase db seed        # Beispieldaten laden
npm run dev             # http://localhost:3000
```

Nach jeder Schemaänderung die Typen neu generieren:

```bash
npm run types           # supabase gen types typescript > types/database.ts
```

---

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Produktionsbuild |
| `npm run test` | Tests für Matching und Puls |
| `npm run lint` | ESLint |
| `npm run types` | Supabase-Typen neu generieren |

---

## Aufbau

```
app/
  (auth)/login           Anmeldung
  (app)/                 geschützter Bereich
    page.tsx             Matches (Startseite)
    postfach/            Eingang und Mailentwürfe
    anfragen/            Anfragen verwalten
    objekte/             Objektbestand
    regeln/              gelernte Ausschlusskriterien
    zahlen/              Auswertung
  actions/               Server Actions (schreibende Operationen)
components/              nach Bereich gegliedert, ui/ für Gemeinsames
lib/
  supabase/              Client für Browser und Server
  queries/               sämtlicher Datenzugriff
  matching.ts            Match-Berechnung
  puls.ts                Frischewert je Anfrage
types/                   generierte und abgeleitete Typen
supabase/migrations/     Schema
docs/                    Prototyp und Projektunterlagen
```

---

## Die zwei Kernstücke

**`lib/puls.ts`** — Jede Anfrage bekommt einen Wert zwischen 4 und 100, abgeleitet aus den Tagen seit dem letzten Kontakt. Ab 60 grün, ab 25 orange, darunter rot. Die EKG-Linie auf der Startseite zeigt den Durchschnitt über alle offenen Anfragen.

**`lib/matching.ts`** — Eine reine Funktion, die Anfrage und Objekt vergleicht und einen Score von 0 bis 100 liefert, gewichtet nach Fläche (30 %), Preis (25 %), Lage (20 %), Bezug (15 %) und Zusatzanforderungen (10 %). Sie füllt ausserdem die Begründung je Kriterium.

Beide liegen bewusst in TypeScript und nicht in der Datenbank: Bei den vorliegenden Datenmengen bringt eine Postgres-Funktion keinen spürbaren Vorteil, erschwert aber Änderungen und Tests.

---

## Regeln für den Code

- Keine Abstraktion vor der dritten Wiederholung.
- Eine Datei, eine Aufgabe. Richtwert unter 200 Zeilen.
- Datenzugriff ausschliesslich in `lib/queries/`, nie direkt in einer Komponente.
- Server Components als Standard, `"use client"` nur bei echter Interaktivität.
- Fachbegriffe deutsch (`Anfrage`, `Objekt`, `Match`), Technisches englisch (`getAnfragen`, `MatchCard`).
- Kein `any`.
- Kommentare nur dort, wo das *Warum* nicht offensichtlich ist.

---

## Berechtigungen

Drei Rollen in `profiles.rolle`:

| Rolle | Rechte |
|---|---|
| `admin` | alles, inklusive Nutzerverwaltung |
| `vermittler` | lesen und schreiben |
| `leser` | nur lesen, ohne vertrauliche Felder |

Als vertraulich markierte Anfragen zeigen der Rolle `leser` weder Firmenname noch Budget. Umgesetzt über die View `anfragen_sichtbar`.

Zusätzlich gibt es drei **Freigabe-Stufen** pro Nutzer, die steuern, was ohne Klick versendet werden darf — von „alles bestätigen" bis „voll autonom". Die Stufe wird serverseitig in der Server Action geprüft, nicht nur in der Oberfläche.

---

## Gestaltung

Ein Arbeitswerkzeug, keine Produktwerbung. Überschriften und Zahlen in Cambria, alles andere in Outfit. Farbtokens in `app/globals.css`, eingebunden über `tailwind.config.ts`.

Wichtigste Regel: **so wenig Text wie möglich**. Statt „Budget nicht genannt — immoheart würde direkt nachfragen." steht schlicht „Budget?". Der Prototyp zeigt das Niveau.

---

## Projektunterlagen

- Prototyp: `docs/puls-cockpit-v5.html` — im Browser öffnen
- Notion: <https://app.notion.com/p/espaceSO-Projekt-3b94c149f8328077a42ac05a5a5ea9c1>

---

## Anhang · Build-Prompt

Der Prompt, mit dem die Umsetzung gestartet wurde. Unverändert lassen, damit nachvollziehbar bleibt, worauf der Code beruht — Änderungen am Projekt gehören in die Abschnitte oben.

> Vollständig in Claude Code, Cursor oder ein vergleichbares Tool einfügen.
> Der beiliegende Prototyp `puls-cockpit-v5.html` ist die verbindliche Vorlage für Aufbau, Ansichten und Gestaltung.

---

Du baust **immoheart**, eine interne Webapp zur Vermittlung von Gewerbeimmobilien für die Geschäftsstelle **espaceSOLOTHURN** (Kanton Solothurn).

Es gibt einen funktionsfähigen HTML-Prototyp. **Bau ihn als echte Anwendung nach** — gleiche Ansichten, gleiche Abläufe, gleiche Gestaltung. Erfinde keine zusätzlichen Funktionen.

### Das Problem

Anfragen nach Gewerbeflächen treffen unstrukturiert per E-Mail ein und werden heute von Hand in Trello erfasst. Das kostet Zeit, und ältere Anfragen geraten in Vergessenheit — wenn Monate später das passende Objekt frei wird, denkt niemand mehr daran.

**Der Kern:** Der Abgleich läuft in beide Richtungen. Nicht nur jede neue Anfrage gegen den Objektbestand, sondern bei **jedem neuen Objekt** gegen **alle offenen Anfragen**, auch Monate alte.

---

### Stack

- **Next.js** (App Router, TypeScript strict)
- **Supabase** (Postgres, Auth, Row Level Security) über `@supabase/supabase-js` und `@supabase/ssr`
- **Tailwind CSS**
- Sonst nichts. Keine State-Bibliothek, kein ORM, keine Komponentenbibliothek, kein Formular-Framework.

---

### Grundsätze für den Code

Das hier ist eine kleine Anwendung für ein kleines Team. Sie soll in einem Jahr noch verständlich sein.

**Einfach halten**
- Keine Abstraktion, die nur einmal verwendet wird. Erst wenn sich etwas zum dritten Mal wiederholt, wird es ausgelagert.
- Keine generischen Wrapper um Supabase. Ein direkter Aufruf ist besser lesbar als ein selbstgebautes Repository-Pattern.
- Keine Konfigurierbarkeit auf Vorrat.

**Struktur**
- Eine Datei, eine Aufgabe. Richtwert: unter 200 Zeilen. Wird eine Komponente länger, zerlege sie.
- Datenzugriff gehört in `lib/queries/`, nie direkt in eine Komponente.
- Server Components als Standard. `"use client"` nur dort, wo wirklich Interaktivität nötig ist (Drawer, Formulare, Filter).
- Schreibende Operationen als Server Actions in `app/actions/`.

**Benennung**
- Fachbegriffe auf Deutsch, weil die Domäne deutsch ist: `Anfrage`, `Objekt`, `Match`, `Nachricht`, `Regel`, `puls`.
- Technisches auf Englisch: `getAnfragen`, `MatchCard`, `useDrawer`.
- Keine Abkürzungen ausser den etablierten (`id`, `db`).

**Typen**
- Typen aus dem Supabase-Schema generieren (`supabase gen types typescript`) und verwenden. Kein `any`.
- Abgeleitete Typen in `types/index.ts` bündeln.

**Kommentare**
- Nur wo das *Warum* nicht offensichtlich ist — etwa bei der Preistoleranz im Matching. Kein Kommentar, der wiederholt, was der Code sagt.

**Tests**
- Nur für `lib/matching.ts` und `lib/puls.ts`, dort aber gründlich (Vitest). Das ist die Logik, die stimmen muss. Keine UI-Tests.

---

### Projektstruktur

```
app/
  (auth)/login/page.tsx
  (app)/
    layout.tsx              Seitenleiste
    page.tsx                Matches (Startseite)
    postfach/page.tsx
    anfragen/page.tsx
    objekte/page.tsx
    regeln/page.tsx
    zahlen/page.tsx
  actions/
    anfragen.ts  objekte.ts  matches.ts  nachrichten.ts
components/
  layout/     Sidebar, Header, Drawer
  matches/    PulsHero, MatchCard, MatchDetail
  postfach/   NachrichtenListe, EingangDetail, EntwurfDetail
  anfragen/   AnfragenTabelle, AnfrageDetail, AnfrageFormular
  objekte/    ObjektRaster, ObjektFormular
  ui/         Button, Chip, Card, Feld
lib/
  supabase/   client.ts, server.ts
  queries/    anfragen.ts, objekte.ts, matches.ts, nachrichten.ts, regeln.ts
  matching.ts
  puls.ts
  format.ts   Flächen, Preise, Daten formatieren
types/index.ts
supabase/migrations/
```

---

### Datenmodell

Alle Tabellen mit `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`.

#### `profiles`
`user_id` → `auth.users` · `name` · `rolle` enum `admin | vermittler | leser` · `freigabe_stufe` smallint default 1

#### `firmen`
`name` · `branche` · `website` · `kontakt_name` · `kontakt_email`

#### `anfragen`
`firma_id` → firmen · `flaeche_min` int · `flaeche_max` int · `ort` text · `budget_pro_m2` numeric · `bezug` text · `nutzung` enum `buero | gewerbe | produktion | lager | verkauf | bauland` · `anforderungen` jsonb default `'{}'` · `status` enum `offen | vermittelt | ruhend` · `vertraulich` boolean default false · `letzter_kontakt` timestamptz default now()

**Wichtig:** `flaeche_min`, `flaeche_max`, `budget_pro_m2` und `bezug` sind **nullable**. Eine unvollständige Anfrage muss sich speichern lassen — das ist ein Kernfall, kein Sonderfall. Die Oberfläche zeigt fehlende Werte als **?**.

#### `objekte`
`titel` · `adresse` · `ort` · `flaeche` int · `preis_pro_m2` numeric (nullable) · `nutzung` (gleiches enum) · `eigenschaften` jsonb default `'{}'` · `verfuegbar_ab` date · `eigentuemer` · `foto_url` text · `status` enum `verfuegbar | reserviert | vermietet`

`anforderungen` und `eigenschaften` halten Zusatzkriterien im selben Schlüsselformat, z. B. `{"rampe": true, "kran_tonnen": 16}`.

#### `matches`
`anfrage_id` · `objekt_id` · `score` smallint · `kriterien` jsonb · `hinweis` text · `status` enum `neu | gesendet | verworfen` · unique (`anfrage_id`, `objekt_id`)

`kriterien` ist ein Array von `{ kriterium, gesucht, angeboten, status }` mit `status` als `ok | teilweise | nein`. Genau daraus baut die Oberfläche die Vergleichstabelle.

#### `nachrichten`
`richtung` enum `eingang | entwurf | gesendet` · `typ` enum `anfrage | angebot | rueckfrage | nachfass` · `anfrage_id` (nullable) · `match_id` (nullable) · `von` · `an` · `betreff` · `body` text · `erkannte_felder` jsonb (nur bei Eingang) · `gesendet_am` timestamptz

#### `regeln`
`code` text · `beschreibung` text · `angewendet_count` int default 0 · `aktiv` boolean default true

---

### Row Level Security

Aktiviere RLS auf allen Tabellen. Halte die Policies kurz:

- Alle eingeloggten Nutzer dürfen lesen.
- Schreiben dürfen nur `admin` und `vermittler`.
- Anfragen mit `vertraulich = true`: Für die Rolle `leser` werden `firma_id` und `budget_pro_m2` ausgeblendet. Löse das über eine View `anfragen_sichtbar` — nicht über verschachtelte Policy-Logik.

---

### Puls

Der Puls gibt jeder Anfrage einen sichtbaren Zustand.

```ts
// lib/puls.ts
export function puls(letzterKontakt: Date): number {
  const tage = Math.floor((Date.now() - letzterKontakt.getTime()) / 86_400_000)
  return Math.max(4, 100 - tage)
}

export function pulsFarbe(wert: number): "gut" | "warn" | "kritisch" {
  if (wert >= 60) return "gut"
  if (wert >= 25) return "warn"
  return "kritisch"
}
```

Mehr ist es nicht. Nicht in die Datenbank verlagern, nicht cachen.

---

### Matching

**Eine reine Funktion in `lib/matching.ts`.** Keine Postgres-Trigger, keine Edge Function — die Logik muss lesbar, testbar und leicht änderbar sein.

```ts
export function berechneMatch(anfrage: Anfrage, objekt: Objekt): Match | null
```

Gewichtung:

| Kriterium | Gewicht | Regel |
|---|---|---|
| Fläche | 30 % | Volle Punktzahl innerhalb der Spanne, lineare Abnahme ausserhalb |
| Preis | 25 % | Bis 12 % über Budget noch voller Treffer, darüber steile Abnahme |
| Lage | 20 % | Gleicher Ort voll, gleiche Region teilweise |
| Bezug | 15 % | Termin passt voll, bis ein Monat Abweichung teilweise |
| Anforderungen | 10 % | Anteil erfüllter Einträge aus `anforderungen` |

Rückgabe `null`, wenn eine aktive Ausschlussregel greift oder der Score unter 60 liegt.

Die Funktion füllt `kriterien` mit den Vergleichswerten und `hinweis` mit dem schwächsten Punkt in einem Satz. **Ein Match ohne Begründung ist wertlos** — das ist die zentrale Anforderung.

Aufgerufen wird sie in den Server Actions:
- nach dem Anlegen oder Ändern eines Objekts gegen **alle** Anfragen mit `status = 'offen'`
- nach dem Anlegen oder Ändern einer Anfrage gegen alle verfügbaren Objekte

Bei knapp 100 Anfragen und 100 Objekten ist das ein Schleifendurchlauf im Millisekundenbereich. Keine Optimierung nötig.

---

### Ansichten

Alle sechs exakt wie im Prototyp.

#### 1 · Matches (Startseite, `/`)

- **Hero mit EKG-Linie** über die volle Breite, an den Rändern auslaufend, mit wanderndem hellem Segment. Ausschlag und Farbe richten sich nach dem Durchschnittspuls aller offenen Anfragen. Links die grosse Zahl mit Label „Bestandspuls", rechts drei Zähler: frisch / altert / kritisch.
- Vier Kennzahlkacheln: Neue Matches, Offene Anfragen, Objekte, Lange still.
- **Match-Karten**: Objektfoto, Objekt mit Google-Maps-Link, Verbindungspfeil, Firma mit Initialen-Logo und Websitelink, Trefferquote. Darunter Kriterien-Chips („Fläche ✓", „Termin ~") und die Knöpfe *Angebot senden* und *Verwerfen*.
- Klick auf eine Karte öffnet den **Drawer** mit der Vergleichstabelle (Kriterium / Gesucht / Objekt / ✓ ~ ✕) und dem Hinweissatz.
- **„Lange nichts gehört"**: die drei Anfragen mit dem längsten Kontaktabstand, je mit Tageszähler und Knopf *Nachfragen*, der einen Mailentwurf anlegt.

#### 2 · Postfach (`/postfach`)

Zweispaltig: links die Liste, rechts das Detail.

- **Eingang und Entwurf müssen auf einen Blick unterscheidbar sein.** Eingang: ↓ auf neutralem Grau. Entwurf: ↑ auf Markenblau. Dazu ein Etikett pro Zeile: „Anfrage", „Anfrage · unvollständig", „Entwurf von immoheart".
- Filter: Alle / Eingang / Entwürfe.
- **Eingang-Detail**: Originaltext, darunter die erkannten Felder als Kacheln. Fehlende Angaben als orange Kachel mit grossem **?**. Aktionen: *Als Anfrage speichern*, *Rückfrage öffnen*.
- **Entwurf-Detail**: An / Betreff / Anhang / Body, im Textfeld bearbeitbar. Aktionen: *Senden*, *Bearbeiten*, *Verwerfen*.
- *Verwerfen* zeigt vier Gründe zur Auswahl und legt daraus eine neue Regel an.

#### 3 · Anfragen (`/anfragen`)

Tabelle: Firma (Logo + Name, Hinweis „vertraulich"), Sucht, Ort (Maps-Link), Budget, Bezug, Status-Chip mit Tageszähler. Fehlende Werte als **?**.

- Zeilenklick öffnet den Drawer mit Daten, bestem Treffer (Balken je Kriterium) und Verlauf.
- **Inline-Bearbeitung**: Knopf *Bearbeiten* macht Sucht, Ort, Budget und Bezug zu Eingabefeldern; leere sind orange umrandet mit Platzhalter „fehlt". Ein Klick direkt auf ein **?** in der Tabelle öffnet sofort den Bearbeiten-Modus.

#### 4 · Objekte (`/objekte`)

Kartenraster mit Foto, Titel, Fläche, Preis, Eigentümer, Maps-Link und Trefferzahl. Anlegen und Bearbeiten über ein einfaches Formular. Fotos zunächst als URL-Feld, kein Upload.

#### 5 · Regeln (`/regeln`)

Liste der gelernten Ausschlusskriterien mit Code, Beschreibung und Anwendungszähler. Deaktivierbar.

#### 6 · Zahlen (`/zahlen`)

Vier Kennzahlkacheln, ein Liniendiagramm zur Erfolgsquote über die Monate, ein Balkendiagramm der gesuchten Flächengrössen. Beides als handgeschriebenes SVG wie im Prototyp — **keine Diagrammbibliothek**.

---

### Freigabe-Stufen

Umschalter in der Seitenleiste, gespeichert in `profiles.freigabe_stufe`:

1. **Alles bestätigen** — immoheart bereitet vor, versendet nichts ohne Klick
2. **Nachfragen automatisch** — Rückfragen bei fehlenden Angaben gehen automatisch raus, Angebote nur nach Freigabe
3. **Voll autonom** — auch Angebote werden automatisch versendet

Prüfe die Stufe **serverseitig** in der Server Action, nicht nur in der Oberfläche.

---

### Gestaltung

Ein Arbeitswerkzeug, keine Produktwerbung. Klar und ruhig.

Übernimm die Tokens aus dem Prototyp in `globals.css` als CSS-Variablen und binde sie in `tailwind.config.ts` ein:

```
--primary: #065A82   --secondary: #1C7293   --navy: #21295C
--bg: #EEF2F5        --surface: #FFFFFF     --surface-2: #F7F9FA
--ink: #1F2429       --ink-2: #5A6472       --ink-3: #98A2AE
--line: #E1E7EC
--good: #0F6E56 auf #F0F6F3
--warn: #A85D14 auf #FDF3E3
--crit: #9B3232 auf #F8EBEB
```

**Schriften** — Überschriften und Zahlen in **Cambria** (Fallback Georgia, serif), alles andere in **Outfit** über `next/font`.

**Formsprache** — Eckenradius 10 px, keine Schatten ausser beim Drawer, 1-px-Linien zur Abgrenzung, farbige Kante links bei hervorgehobenen Karten.

**Dunkelmodus** auf Basis `#161A33` / `#1E2447`, umschaltbar.

**Textregel — die wichtigste:** So wenig Text wie möglich. Statt „Budget nicht genannt — immoheart würde direkt nachfragen." steht schlicht **„Budget?"**. Keine Sätze darüber, was die Software alles kann. Der Prototyp zeigt das Niveau; bleib darunter, nicht darüber.

**Echte Verknüpfungen** — Kartenlinks auf Google Maps mit der tatsächlichen Adresse, Firmenlinks auf die Website, Mailadressen als `mailto:`.

---

### Reihenfolge

1. Schema, Migrationen, RLS, Seed-Daten mit den Solothurner Beispieldaten aus dem Prototyp
2. Auth, geschützte Routen, Rollen
3. Layout: Seitenleiste, Kopfzeile, Drawer, Design-Tokens
4. `lib/puls.ts` und `lib/matching.ts` samt Tests — **vor** der Oberfläche
5. Anfragen und Objekte inklusive Inline-Bearbeitung
6. Matches mit Hero und Drawer
7. Postfach
8. Regeln, Zahlen

Nach jedem Schritt ein lauffähiger Stand. Keine halben Funktionen.

---

### Nicht bauen

Kein echter Mailversand (Entwürfe werden gespeichert, `gesendet_am` gesetzt), keine automatische Mail-Auslese (`erkannte_felder` wird beim Seed befüllt), keine Zahlungsabwicklung, kein Mandantensystem, keine externen Immobilienplattformen, keine native App.

---

### Ergänzungen aus Notion

<!-- Anforderungen aus dem Notion-Dokument hier einfügen, die oben fehlen. -->

---

### Abnahmekriterien

- Eine Anfrage ohne Budget und ohne Bezugstermin lässt sich speichern, und die Lücken erscheinen in Liste und Detail als **?**.
- Ein neu angelegtes Objekt erzeugt Matches gegen **alle** offenen Anfragen, auch gegen solche mit über 90 Tagen ohne Kontakt.
- Jeder Match zeigt Kriterium für Kriterium, was passt und was nicht.
- Eine vertrauliche Anfrage zeigt der Rolle `leser` weder Firmenname noch Budget.
- Auf Freigabestufe 1 verlässt keine Nachricht das System ohne Klick — serverseitig geprüft.
- Der Bestandspuls ändert sich nachvollziehbar, wenn bei einer Anfrage der letzte Kontakt aktualisiert wird.
- `lib/matching.ts` und `lib/puls.ts` sind durch Tests abgedeckt.
- Keine Komponente über 200 Zeilen, kein `any` im Projekt.
