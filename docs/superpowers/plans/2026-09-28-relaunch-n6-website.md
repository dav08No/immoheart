# Relaunch N6 · Öffentliche Website: Landingpage mit 3D-Hero, Suchauftrag, Inserieren, Rechtstexte, SEO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die öffentliche Website ist fertig: Landingpage mit Hero (Fraunces, wortweise eingeblendet, Pulsring-Knöpfe, WebGL-Stadtmodell), Live-Zahlen, „So funktioniert's“ mit EKG-Linie, ausgewählten Objekten (3D-Tilt), „Warum immoheart“, Kontakt; Seiten `/suchauftrag` (Formular + Mail-Variante), `/inserieren`, `/impressum`, `/datenschutz`; vollständiger Header (Navigation, Hell/Dunkel, glasig beim Scrollen, Handy-Menü) und Footer; SEO (Metadaten, OG-Bild, `sitemap.xml`, `robots.txt`). Ein Suchauftrag landet als Website-Eintrag mit Entwurf im Postfach.

**Architecture:** Öffentliche Seiten sind Server Components; Animationen in kleinen Client-Inseln mit `motion` und reiner CSS, alle mit `prefers-reduced-motion`-Fallback. Das 3D-Stadtmodell (`three` + `@react-three/fiber`) wird **nur auf `/`** und erst nach dem ersten Rendern per `next/dynamic` (`ssr: false`) nachgeladen; ohne WebGL, bei reduzierter Bewegung oder schwachen Geräten bleibt ein statisches SVG. Der Suchauftrag nutzt denselben Schutz wie „Objekt anfragen“ (Honeypot, Zeit-Token, Limit, zod, `method="post"`, Knopf erst nach Hydrierung) über eine gemeinsame Speicher-Hilfe; der Entwurf ist eine feste Vorlage (**keine KI**). Die Einträge tragen `kategorie = 'suchanfrage'`, `quelle = 'website'` und `erkannte_felder` im `ErkannteFelder`-Format, damit „Als Anfrage speichern“ ohne Sonderweg funktioniert.

**Tech Stack:** Next.js 15.5, React 19.1, Tailwind v4, shadcn, `motion` 13.4.4, `three` 0.186.1, `@react-three/fiber` 9.8.1 (`@types/three` 0.186.0 dev), zod 4, Vitest. `@react-three/drei` wird nur installiert, wenn es tatsächlich gebraucht wird (YAGNI).

**Spec:** `docs/superpowers/specs/2026-09-26-relaunch-design.md` — Abschnitt 1 (Routen), 2 (Website-Einträge), 4 (Website, Design-System, SEO), 5 (Sicherheit, Tests), Meilenstein N6.

## Global Constraints

- Alle Regeln aus N1–N5: Namen deutsch, kein `any`, Dateien < 200 Zeilen, Datenzugriff in `lib/queries/`, kurze Warum-Kommentare.
- Öffentliche Seiten lesen nur `objekte_oeffentlich`/`objekt_fotos` mit dem Server-Client; **nie Adresse oder Eigentümer**; nie Admin-Client in `app/(public)` oder `components/public`.
- Öffentliche Formulare: zod, Honeypot, Mindestzeit 3 s (Zeit-Token), Limit 5/Stunde je IP-Hash (gemeinsamer Zähler mit „Objekt anfragen“ ist erlaubt), **keine Mail an Besucher**, keine KI, `method="post"`, Absende-Knopf erst nach Hydrierung aktiv, Eingaben bleiben bei Fehlern erhalten, deutsche Feldmeldungen, generische Fehler (keine DB-Details).
- `mailto`-Vorlagen und alle dynamischen URL-Teile mit `encodeURIComponent`; keine Weiterleitung auf URLs aus Parametern. Kein `dangerouslySetInnerHTML`.
- Alle Animationen respektieren `prefers-reduced-motion` (statisch). Responsiv bis 360 px ohne horizontales Scrollen.
- Farben nur über die Tokens in `app/globals.css` (Petrol/Navy, Herz-Koralle sparsam), Hell- und Dunkelmodus.
- 3D nur auf `/`, nachgeladen nach dem ersten Rendern; die übrigen Seiten laden kein `three`.
- Neue Pakete exakt pinnen, `npm audit --omit=dev` ohne high/critical.
- Nichts wird automatisch gesendet.
- Testdaten tragen „[TEST]“, nach dem Live-Test aufräumen (Website-Einträge dürfen hart gelöscht werden; Mail-Eingänge nur soft).
- Commits enden mit Leerzeile und exakt:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01CbSKvzEHCKZUWFsZgFgstd`
- Branch `feature/n6-website`, Worktree `.worktrees/n6`. Blockierte Befehle: BLOCKED melden.

## Dateiübersicht

| Datei | Aktion | Zweck |
|---|---|---|
| `package.json` | ändern | motion, three, @react-three/fiber, @types/three |
| `components/theme/ThemeUmschalter.tsx` | neu | Hell/Dunkel (aus `components/layout/Header.tsx` herausgelöst, dort wiederverwendet) |
| `components/public/SiteHeader.tsx`, `MobilMenue.tsx`, `SiteFooter.tsx` | ändern/neu | Navigation, Glas-Effekt, Handy-Menü, Footer-Links |
| `lib/suchauftrag.ts` (+Test) | neu | Schema, Nachricht, Entwurfsvorlage |
| `lib/mailto.ts` (+Test) | neu | Mail-Vorlagen Suchauftrag/Inserieren |
| `lib/website-speichern.ts` | neu | gemeinsamer Ablauf Honeypot → Token → zod → Limit → Speichern (server-only) |
| `app/actions/suchauftrag.ts`, `app/actions/objektanfrage.ts` | neu/ändern | nutzen den gemeinsamen Ablauf |
| `app/(public)/suchauftrag`, `inserieren`, `impressum`, `datenschutz` | neu | Seiten |
| `app/(public)/page.tsx`, `components/public/start/*` | neu | Landingpage |
| `components/public/start/Stadtmodell*.tsx` | neu | 3D-Hero + Fallback |
| `lib/queries/oeffentlich.ts` (`holeKennzahlen`) + `lib/kennzahlen.ts` (+Test) | ändern/neu | Live-Zahlen |
| `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx`, `lib/basis-url.ts` | neu/ändern | SEO |

---

### Task 1: Pakete, Theme-Umschalter, Header, Footer

**Files:** `package.json`, `components/theme/ThemeUmschalter.tsx`, `components/layout/Header.tsx`, `components/public/{SiteHeader,MobilMenue,SiteFooter}.tsx`

- [ ] `npm install --save-exact motion@13.4.4 three@0.186.1 @react-three/fiber@9.8.1` und `npm install --save-dev --save-exact @types/three@0.186.0`; `npm audit --omit=dev`.
- [ ] `ThemeUmschalter` aus dem Admin-Header herauslösen (gleiches Verhalten: `data-theme` am `<html>`, Cookie `immoheart-theme`, kein Theme-Flash); Admin-Header nutzt ihn.
- [ ] Header: Logo (schlagendes Herz), Navigation **Objekte** (`/objekte`) · **Suchauftrag** (`/suchauftrag`) · **Inserieren** (`/inserieren`) · **Kontakt** (`/#kontakt`), aktive Seite markiert (`aria-current="page"`), Theme-Umschalter, Knopf „Login“. Beim Scrollen (> 8 px) glasig-transparent (`backdrop-blur`, halbtransparente Fläche, feiner Rand) — kleiner Client-Teil mit passivem Scroll-Listener. Unter `md` ein Menü-Knopf, der ein shadcn-`Sheet` mit denselben Links öffnet.
- [ ] Footer: Logo, „ein Angebot von espaceSOLOTHURN“, Mail-Link, Links **Impressum**, **Datenschutz**, **Objekte**, **Login**; © Jahr.
- [ ] Checks (`npm run lint && npx tsc --noEmit && npm run test && npm run build`); Commit `feat: Pakete, Theme-Umschalter, oeffentlicher Header mit Handy-Menue und Footer`.

---

### Task 2: Reine Logik (TDD) + gemeinsamer Speicher-Ablauf

**Files:** `lib/suchauftrag.ts` (+Test), `lib/mailto.ts` (+Test), `lib/kennzahlen.ts` (+Test), `lib/website-speichern.ts`, `app/actions/objektanfrage.ts` (Refactor)

**Interfaces (Produces):**

`lib/suchauftrag.ts`
```ts
export const suchauftragSchema // zod: firma (1–120), name (1–120), email (lowercase, email, ≤200), telefon (optional, wie objektanfrage), nutzung (nutzung_enum), ort (1–80), flaecheMin/flaecheMax (Ganzzahl 0–100000, optional; min ≤ max nach Tausch), budgetProM2 (Ganzzahl 0–10000, optional), bezug (optional, ≤ 80, Freitext z. B. "sofort", "ab 1.1.2027"), nachricht (optional, ≤ 2000); deutsche Meldungen wie in lib/website-eintrag.ts
export type Suchauftrag = z.infer<typeof suchauftragSchema>
export function suchauftragFelder(s: Suchauftrag): ErkannteFelder   // firma, branche null, flaeche_min/max, ort, budget_pro_m2, bezug, nutzung
export function suchauftragNachricht(s: Suchauftrag, an: string): NachrichtEinfuegen
//   richtung eingang, typ anfrage, quelle website, kategorie suchanfrage, ki_status fertig, gelesen false,
//   von = email, betreff `Suchauftrag: ${nutzungLabel} in ${ort}`, body lesbarer Text aller Angaben,
//   erkannte_felder = { ...suchauftragFelder(s), kontakt: { name, email, telefon, nachricht } }
export function suchauftragEntwurf(s: Suchauftrag): { betreff: string; body: string }
//   Vorlage: Dank, Zusammenfassung der Suche (Fläche, Ort, Budget, Bezug), „wir melden uns mit passenden Objekten“, Signatur
```
Tests: Schema (Pflichtfelder, Zahlen, Tausch min/max, ungültige Nutzung, deutsche Meldungen), Felder-Abbildung, Nachricht (Felder/Kategorie/Quelle), Entwurf ohne Platzhalter.

`lib/mailto.ts`
```ts
export const IMMOHEART_MAIL = "immoheart.business@gmail.com"
export function mailtoLink(betreff: string, text: string): string  // mailto:…?subject=…&body=… mit encodeURIComponent, Zeilenumbrüche %0A
export const SUCHAUFTRAG_VORLAGE: { betreff: string; text: string }   // Checkliste: Firma, Branche, Nutzung, Ort, Fläche, Budget, Bezug
export const INSERIEREN_VORLAGE: { betreff: string; text: string }    // Adresse, Fläche, Preis, Nutzung, Verfügbarkeit, **„Bitte Fotos als Anhang mitsenden“**
```
Tests: Kodierung von Umlauten, `&`, `?`, `#`, Zeilenumbrüchen; Vorlage Inserieren enthält den Foto-Hinweis.

`lib/kennzahlen.ts`
```ts
export type Kennzahlen = { objekte: number; flaecheTotal: number; orte: number }
export function berechneKennzahlen(objekte: { ort: string; flaeche: number }[]): Kennzahlen  // Orte distinct, case-insensitiv getrimmt
export function waehleHighlights<T extends { titelbild: string | null; created_at: string }>(objekte: T[], max: number): T[] // mit Bild zuerst, dann neueste
```

`lib/website-speichern.ts` (server-only): gemeinsamer Ablauf für öffentliche Formulare, damit „Objekt anfragen“ und „Suchauftrag“ dieselbe Reihenfolge haben: `honeypot → zeitToken → zod → limit → vorbereiten() → Eingang + Entwurf speichern (Admin-Client) → revalidate`. Signatur nach Ermessen des Implementers, z. B. `speichereWebsiteEintrag<T>({ eingabe, schema, pruefe?: (daten) => Promise<Fehler|null>, baueNachricht, baueEntwurf })`. `objektAnfragen` wird darauf umgestellt, **ohne Verhaltensänderung** (bestehende Tests `app/actions/objektanfrage.test.ts` und `lib/objektanfrage-ergebnis.test.ts` bleiben grün; Reihenfolge-Test bleibt gültig).

- [ ] RED → GREEN; Checks; Commit `feat: Suchauftrag-, Mailto- und Kennzahlen-Logik; gemeinsamer Ablauf fuer Website-Formulare`.

---

### Task 3: `/suchauftrag`

**Files:** `app/actions/suchauftrag.ts`, `app/(public)/suchauftrag/page.tsx`, `components/public/suchauftrag/*`

- [ ] Action `suchauftragSenden(eingabe: unknown)` über den gemeinsamen Ablauf; Ergebnisform wie `ObjektAnfrageErgebnis`; Entwurf `typ 'antwort'`, `antwort_auf`, `an = email`.
- [ ] Seite: Einleitung; links das Formular (Firma, Name, E-Mail, Telefon optional, Nutzung (Select), Ort, Fläche von/bis, Budget/m², Bezug, Nachricht; Honeypot; Zeit-Token vom Server; Danke-Zustand; Token-Erneuerung wie im Objektformular); rechts „Lieber per Mail?“ mit Checkliste, Knopf „Adresse kopieren“ (`navigator.clipboard`, Bestätigung „Kopiert“) und `mailto` mit `SUCHAUFTRAG_VORLAGE`.
- [ ] Formular-Bausteine aus `components/public/objekte/AnfrageFeld.tsx` wiederverwenden (ggf. nach `components/public/formular/` verschieben).
- [ ] Im Postfach: der Eintrag erscheint unter „Website“, Chip „Suchanfrage“, KI-Bereich ausgeblendet (quelle website), „Als Anfrage speichern“ funktioniert (Nutzung ist gesetzt; Anfrage mit `quelle = 'website'` — dafür im bestehenden Suchanfrage-Weg `quelle` aus der Nachricht übernehmen statt fest `'mail'`).
- [ ] Metadaten; Checks; Commit `feat: Suchauftrag-Seite mit Formular und Mail-Variante`.

---

### Task 4: `/inserieren`, `/impressum`, `/datenschutz`

**Files:** `app/(public)/{inserieren,impressum,datenschutz}/page.tsx`, `components/public/inhalt/*`

- [ ] `/inserieren`: Ablauf in 3 Schritten (Mail senden → wir prüfen und melden uns → Objekt wird veröffentlicht), Checkliste (Adresse, Fläche, Preis, Nutzung, Verfügbarkeit, **Fotos als Anhang mitsenden** hervorgehoben), `mailto` mit `INSERIEREN_VORLAGE`, „Adresse kopieren“.
- [ ] `/impressum`: Grundtext mit klar markierten Platzhaltern für Betreiberangaben (`[Name / Firma]`, `[Adresse]`, `[UID]`), Kontakt-Mail, Haftungs- und Urheberrechtshinweis (kurz, CH-üblich). Hinweis im Seitenkopf nur als Kommentar im Code: „von Davide zu prüfen“.
- [ ] `/datenschutz`: Grundtext (CH-DSG/DSGVO-nah): Verantwortliche Stelle (Platzhalter), welche Daten (Formulare, E-Mails inkl. Anhänge, Server-Logs), Zweck, Empfänger/Auftragsverarbeiter (Vercel — Hosting; Supabase — Datenbank/Speicher; Google — Gmail, Gemini-KI für eingehende Mails, Google-Maps-Einbettung auf Objektseiten), Cookies (nur technisch nötig: Login-Sitzung, Theme), IP nur als gesalzener Hash für das Formular-Limit, Speicherdauer, Rechte der Betroffenen, Kontakt.
- [ ] Gemeinsames, gut lesbares Layout für Textseiten (`prose`-ähnlich über eigene Klassen, max. ~70 Zeichen Zeilenlänge).
- [ ] Metadaten; Checks; Commit `feat: Inserieren, Impressum und Datenschutz`.

---

### Task 5: Landingpage (ohne 3D)

**Files:** `app/(public)/page.tsx`, `components/public/start/{Hero,HeroText,PulsKnopf,Kennzahlen,Zaehler,SoFunktionierts,EkgLinie,Highlights,TiltKarte,Warum,Kontakt}.tsx`, `lib/queries/oeffentlich.ts`

- [ ] `holeKennzahlen()` und Highlights (max. 3, `waehleHighlights`) aus `holeOeffentlicheObjekte()` (Server-Client).
- [ ] Hero: `h1` „Gewerbeflächen mit Herzschlag.“ in Fraunces, Wörter nacheinander eingeblendet (`motion`, gestaffelt; bei reduzierter Bewegung sofort sichtbar; Text für Screenreader als Ganzes). Unterzeile. Knöpfe „Objekte ansehen“ (`/objekte`) und „Suchauftrag erteilen“ (`/suchauftrag`) mit Pulsring (CSS-Animation, koralle/petrol, reduziert statisch). Rechts Platz für das Stadtmodell (Task 6) — bis dahin das statische SVG. Hintergrund Petrol→Navy-Verlauf in hellem und dunklem Modus lesbar.
- [ ] Live-Zahlen: verfügbare Objekte, m² total, Orte — Hochzählen beim Sichtbarwerden (`IntersectionObserver`/`motion`), reduziert: Endwert sofort; Zahlen im Server-HTML (SEO, ohne JS korrekt).
- [ ] „So funktioniert's“: zwei Spuren (Suchende: Suchauftrag → passende Objekte → Besichtigung; Eigentümer: Mail mit Fotos → Prüfung → Veröffentlichung), je 3 Schritte; eine EKG-Linie (SVG-Pfad) zeichnet sich beim Scrollen (`pathLength`), reduziert statisch.
- [ ] Ausgewählte Objekte als Karten mit 3D-Tilt (Pointer-Bewegung → `rotateX/Y` max. ~6°, `perspective`), nur mit feinem Zeiger (`(pointer: fine)`), reduziert ohne Tilt; Link zur Detailseite; „Alle Objekte“.
- [ ] „Warum immoheart“ (3–4 Punkte: persönlich, regional, schnelle Antwort, geprüfte Angaben), Kontakt-Block mit Anker `id="kontakt"` (Mail, „Adresse kopieren“, Links Suchauftrag/Inserieren).
- [ ] Metadaten der Startseite (Titel, Beschreibung, OG).
- [ ] Checks; Commit `feat: Landingpage mit Hero, Live-Zahlen, EKG-Ablauf, Highlights und Kontakt`.

---

### Task 6: 3D-Stadtmodell

**Files:** `components/public/start/{Stadtmodell,StadtSzene,StadtFallback,useDarf3d}.tsx`

- [ ] `StadtSzene` (Client, `@react-three/fiber`): stilisierte Gewerbebauten (Quader unterschiedlicher Höhe, wenige Dutzend Meshes, `meshStandardMaterial` in Petrol-Tönen, ein Gebäude korallrot mit Herzschlag-Skalierung/Emission im 1,2-s-Rhythmus der `herzschlag`-Keyframes), langsame Drehung der Gruppe, EKG-Linie am Boden (Linie/`Line`-Geometrie, deren Verlauf wandert), leichte Reaktion auf die Maus (Kamera-/Gruppenneigung gedämpft), Hell/Dunkel-Farben aus CSS-Variablen gelesen. `dpr` begrenzt (max. 1.5), `frameloop` pausiert, wenn nicht sichtbar (IntersectionObserver) oder Tab verborgen.
- [ ] `useDarf3d()`: false bei `prefers-reduced-motion`, ohne WebGL (`canvas.getContext("webgl2") || "webgl"`), `navigator.hardwareConcurrency <= 2` oder `deviceMemory <= 2` (falls vorhanden), sehr schmalem Bildschirm (< 360 px).
- [ ] `Stadtmodell`: rendert zuerst `StadtFallback` (statisches SVG mit gleicher Bildsprache, auch im Server-HTML), nach dem ersten Rendern und bei `useDarf3d()` wird `StadtSzene` per `next/dynamic({ ssr: false })` geladen und blendet über; Fehler in der Szene (Error Boundary) → Fallback bleibt.
- [ ] Nur in `Hero` auf `/` verwendet. Prüfen, dass `three` nicht in anderen Routen-Chunks landet (`npm run build` Ausgabe: First Load JS von `/objekte` unverändert gegenüber vorher ± wenige kB).
- [ ] Checks; Commit `feat: WebGL-Stadtmodell im Hero mit statischem Fallback`.

---

### Task 7: SEO

**Files:** `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx`, `app/layout.tsx`, `lib/basis-url.ts` (+Test falls reine Logik)

- [ ] Basis-URL für Metadaten: `metadataBase` aus `VERCEL_PROJECT_PRODUCTION_URL` (Production) bzw. `VERCEL_URL`, sonst `http://localhost:3000` — reine Funktion `oeffentlicheBasisUrl(env)` mit Test.
- [ ] `sitemap.ts`: `/`, `/objekte`, `/suchauftrag`, `/inserieren`, `/impressum`, `/datenschutz` und alle öffentlichen Objekte (`/objekte/[id]`, `lastModified` = `created_at`), über den Server-Client.
- [ ] `robots.ts`: erlaubt alles außer `/admin`, `/api`, `/auth`, `/login`, `/passwort-setzen`, `/passwort-vergessen`, `/abmelden`; verweist auf die Sitemap. Auf Preview-Deployments (`VERCEL_ENV !== "production"`) `disallow: "/"`.
- [ ] `opengraph-image.tsx` (Standard-OG-Bild, 1200×630, `next/og`): Petrol→Navy-Verlauf, Herz, „immoheart“, Claim. Objektseiten behalten ihr Titelbild (N5).
- [ ] Jede öffentliche Seite hat `title`/`description`; Admin-Seiten `robots: { index: false }` (im Admin-Layout).
- [ ] Checks; Commit `feat: Sitemap, robots, OG-Bild und Metadaten`.

---

### Task 8: Gesamtprüfung, Push

- `npm run lint && npx tsc --noEmit && npm run test && npm run build && npm audit --omit=dev`.
- `grep -rn "adresse\|eigentuemer\|erstelleAdminClient" "app/(public)" components/public` → leer (außer serverseitiger `lib/website-speichern.ts`, der nicht in diesen Ordnern liegt).
- `grep -rn "dangerouslySetInnerHTML" app components` → leer.
- Build-Ausgabe: `three` nur im Chunk von `/`.
- Push.

### Task 9: Live-Test (Controller + Davide), Merge

- Startseite hell/dunkel, Handy-Breite (DevTools 375 px), reduzierte Bewegung (DevTools-Emulation) → statisch; 3D lädt auf Desktop, pausiert im Hintergrund-Tab.
- Header: Navigation, aktive Seite, Glas-Effekt, Handy-Menü; Footer-Links.
- `/suchauftrag`: Formular (Testdaten `[TEST]`, `immoheart.business+n6@gmail.com`) → Danke; Honeypot; Eintrag im Postfach (Website, Suchanfrage, ohne KI-Bereich) mit Entwurf; „Als Anfrage speichern“ → Anfrage `quelle = website`. Mail-Variante: `mailto`-Link öffnet Vorlage korrekt (Link-Text prüfen), „Adresse kopieren“.
- `/inserieren`: Foto-Hinweis sichtbar, `mailto` korrekt.
- `/impressum`, `/datenschutz` erreichbar, Platzhalter markiert.
- `/sitemap.xml`, `/robots.txt` (Preview: disallow all), OG-Bild `/opengraph-image`.
- Aufräumen, Davides OK → Merge.

## Abnahme N6

- Alle öffentlichen Seiten live; Suchauftrag landet im Postfach mit Entwurf, ohne KI und ohne Mail an den Besucher.
- 3D nur auf der Startseite, mit Fallback; alle Animationen bei reduzierter Bewegung statisch; keine Seite bricht auf Handybreite.
- Rechtstexte vorhanden (Platzhalter für Davides Angaben klar markiert).
- Sitemap, robots, OG-Bild, Metadaten je Seite; `/admin` nicht indexierbar.
