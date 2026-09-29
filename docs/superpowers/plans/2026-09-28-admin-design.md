# Admin-Design — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle Admin- und Anmelde-Seiten bekommen einen einheitlichen, klar gegliederten Aufbau im Stil der öffentlichen Website (dunkle Markenleiste, Fraunces-Titel, Panels, Herz-Akzente) — ohne jede Funktionsänderung.

**Architecture:** Zuerst Tokens und ein kleines Baustein-Set (`components/ui/*` erweitert, neue Bausteine daneben), dann das Grundgerüst (Seitenleiste, Seitenkopf, Layout, Drawer), dann jede Seite auf die Bausteine umgestellt, zuletzt die Anmelde-Seiten. Reine Hilfsfunktionen (Status-Töne, Kontextzeilen) sind getestet; Funktionsgleichheit wird pro Task durch unveränderte Action-Aufrufe, Props und Texte der Abläufe gesichert.

**Tech Stack:** Next.js 15.5, React 19.1, Tailwind v4, shadcn (vorhanden), lucide-react, Vitest. Keine neuen Pakete.

**Spec:** `docs/superpowers/specs/2026-09-28-admin-design-design.md`

## Global Constraints

- **Funktional exakt gleich:** keine Änderung an Server Actions, Queries, Datenflüssen, Props-Verträgen zwischen Server und Client (ausser rein darstellenden), Bestätigungsdialogen, Toast-/Fehlertexten, Weiterleitungen, Formularfeldern (Name/Typ/Pflicht/Validierung). Geändert werden nur Markup-Struktur, Klassen, Seitenüberschriften und Kontextzeilen.
- Keine Datenbank-Änderung, keine neuen Pakete.
- Farben nur über Tokens in `app/globals.css`, jeweils für Hell und Dunkel; Kontrast Text ≥ 4.5:1, UI-Elemente/Fokus ≥ 3:1 in beiden Modi.
- Handy ab 360 px ohne horizontales Seiten-Scrollen; Desktop-Seitenleiste ab `lg` wie in N7 (Sheet darunter).
- Alle Bewegungen `prefers-reduced-motion`-fest; vorhandene Puls-/Herzschlag-Effekte bleiben.
- Kein `any`, Dateien < 200 Zeilen (bestehende Übergrösse `components/anfragen/AnfrageDetail.tsx` (246) wird beim Umbau aufgeteilt), kurze Warum-Kommentare, deutsche Namen.
- Commits enden mit Leerzeile und exakt:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01CbSKvzEHCKZUWFsZgFgstd`
- Branch `feature/admin-design`, Worktree `.worktrees/admin-design`. Blockierte Befehle: BLOCKED melden.

## Review Focus

1. **Funktionsverlust durch Umbau:** ein Knopf, Link oder Dialog fällt beim Umstellen weg oder verliert seinen Handler/`disabled`-Zustand — jede Seite behält alle Aktionen (Review vergleicht Action-Imports und Handler vor/nach).
2. **Dunkle Seitenleiste:** Fokusring, Badges, aktiver Punkt und Profilbereich lesbar in Hell und Dunkel; Herzschlag-Klassen (N7) greifen weiterhin.
3. **Lange Inhalte:** lange E-Mail-Adressen, Betreffs, Firmennamen, Objekttitel in Listenzeilen, Karten, Chips und Seitenkopf brechen um oder kürzen, statt zu überlaufen (360 px).
4. **Leere und fehlende Werte:** Leerzustände überall statt leerer Panels; `Feld`-Regel („?“ bzw. „–“) bleibt.
5. **Tastatur und Screenreader:** alle interaktiven Elemente fokussierbar mit sichtbarem Fokus, Listenzeilen als Buttons/Links, Icon-Knöpfe mit `aria-label`, Überschriften-Hierarchie (ein `h1` je Seite).

---

### Task 1: Tokens und Bausteine

**Files:**
- Modify: `app/globals.css` (Tokens), `components/ui/Button.tsx`, `components/ui/Card.tsx`, `components/ui/Chip.tsx`
- Create: `components/ui/{Panel,Abschnittstitel,Kennzahl,ListenZeile,StatusChip,Leerzustand,Tabelle,FormFeld}.tsx`, `lib/ui/status-ton.ts` (+`.test.ts`)

**Interfaces (Produces):**

```ts
// app/globals.css — neue Tokens (Hell + Dunkel), mit @theme inline-Farben:
// --nav-von, --nav-bis (Verlauf), --nav-text, --nav-text-2, --nav-hover, --nav-aktiv-bg,
// --nav-linie, --nav-badge-bg, --nav-badge-fg, --panel-schatten; --radius-panel: 14px

// components/ui/Button.tsx — bestehende API bleibt kompatibel:
type Variante = "primaer" | "sekundaer" | "dezent" | "gefaehrlich"
export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; groesse?: "sm" | "md"; icon?: ReactNode }): JSX.Element
// default variante "sekundaer", groesse "sm" (bisheriges Verhalten)

// components/ui/Panel.tsx
export function Panel(p: { children: ReactNode; className?: string; as?: "section" | "div" | "article"; polster?: boolean /* default true */ }): JSX.Element
export function PanelKopf(p: { titel: string; beschreibung?: string; aktionen?: ReactNode; ebene?: 2 | 3 /* default 2 */ }): JSX.Element
// components/ui/Card.tsx bleibt als dünner Alias auf Panel (polster=false), damit bestehende Aufrufer weiterlaufen

export function Abschnittstitel(p: { children: ReactNode; className?: string }): JSX.Element   // <h3 class="text-[11px] font-semibold uppercase tracking-wider text-ink-3">

export function Kennzahl(p: { label: string; wert: string | null; zusatz?: string; ton?: StatusTon }): JSX.Element // wert null -> "–" + "Noch keine Daten"

export function ListenZeile(p: {
  titel: string; unterzeile?: string; zeit?: string; badges?: ReactNode; icon?: ReactNode
  ungelesen?: boolean; ausgewaehlt?: boolean; onClick?: () => void; href?: string; ariaLabel?: string
}): JSX.Element  // Button oder Link; Titel/Unterzeile mit truncate + title-Attribut

export type StatusTon = "gut" | "warn" | "kritisch" | "info" | "neutral"
export function StatusChip(p: { ton?: StatusTon; children: ReactNode; icon?: ReactNode }): JSX.Element
// components/ui/Chip.tsx bleibt kompatibel (kind -> ton)

export function Leerzustand(p: { text: string; aktion?: ReactNode; klein?: boolean }): JSX.Element // Herz-Icon (lucide Heart, text-heart/60)

export function Tabelle(p: { children: ReactNode; ariaLabel: string }): JSX.Element // overflow-x-auto Hülle + <table> mit Basisklassen
export function FormFeld(p: { label: string; htmlFor: string; hinweis?: string; fehler?: string; children: ReactNode }): JSX.Element
export const EINGABE_KLASSE: string   // gemeinsame Klassen für input/select/textarea (Höhe, Radius, Fokusring Petrol, aria-invalid rot)

// lib/ui/status-ton.ts (rein, getestet)
export function objektStatusTon(s: "verfuegbar" | "reserviert" | "vermietet"): StatusTon   // gut / warn / neutral
export function anfrageStatusTon(s: "offen" | "vermittelt" | "ruhend"): StatusTon           // info / gut / neutral
export function pulsTon(farbe: "gut" | "warn" | "kritisch"): StatusTon
export function kiStatusTon(s: string | null): StatusTon                                    // fertig gut, laeuft info, offen neutral, fehler kritisch, null neutral
```

- [ ] **Step 1:** Tests für `lib/ui/status-ton.ts` schreiben (jede Eingabe, unbekannter KI-Status → neutral), laufen lassen (RED).
- [ ] **Step 2:** `status-ton.ts` implementieren (GREEN).
- [ ] **Step 3:** Tokens in `app/globals.css` (Hell + Dunkel) ergänzen: Nav-Verlauf Hell `#065A82 → #21295C`, Dunkel `#0F4566 → #0E1330`; Nav-Text `#FFFFFF`/`#D5E6F0` (Kontrast auf beiden Verlaufsenden ≥ 4.5:1 prüfen und im Commit-Text notieren); `--panel-schatten: 0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px rgb(15 23 42 / 0.04)` (Dunkel: dunklere Variante).
- [ ] **Step 4:** Bausteine gemäss Interfaces bauen; `Card`/`Chip`/`Button` bleiben rückwärtskompatibel (bestehende Aufrufer kompilieren ohne Änderung).
- [ ] **Step 5:** `npm run lint && npx tsc --noEmit && npm run test && npm run build`; Commit `feat(admin-ui): Tokens und gemeinsame Bausteine`.

---

### Task 2: Grundgerüst — Seitenleiste, Seitenkopf, Layout, Drawer, Fehlerseite

**Files:** `components/layout/{Sidebar,Header,MobilLeiste,Drawer}.tsx`, `app/admin/layout.tsx`, `app/admin/error.tsx`, neu `components/layout/Seitenkopf.tsx`, `lib/admin/kontext.ts` (+`.test.ts`)

**Interfaces:**

```ts
// Seitenkopf ersetzt Header (Header bleibt als Re-Export für Übergang, wird in Task 3–7 nicht mehr verwendet und am Ende gelöscht)
export function Seitenkopf(p: { titel: string; kontext?: string; aktion?: ReactNode; aktionMobil?: ReactNode }): JSX.Element
// sticky top-0, bg-surface/80 backdrop-blur, border-b; h1 font-display text-xl lg:text-2xl; kontext text-sm text-ink-3 truncate;
// rechts: aktion (ab sm sichtbar), aktionMobil (unter sm), ThemeUmschalter; links MobilLeiste (unter lg)

// lib/admin/kontext.ts (rein, getestet) — Kontextzeilen je Seite
export function kontextMatches(neueTreffer: number, langeOhneKontakt: number): string   // "3 neue Treffer · 2 lange ohne Kontakt"; 0 -> "Keine neuen Treffer"
export function kontextAnfragen(offen: number, vermittelt: number): string
export function kontextObjekte(gesamt: number, oeffentlich: number): string
export function kontextEntwuerfe(offen: number): string
export function kontextNutzer(aktiv: number, eingeladen: number): string
// Singular/Plural korrekt ("1 neuer Treffer"), Zahlen mit formatZahl
```

- [ ] Tests für `kontext.ts` (Singular/Plural, 0-Fälle), RED → GREEN.
- [ ] **Seitenleiste** gemäss Spec §1: Verlauf `bg-linear-to-b from-nav-von to-nav-bis`, Logo hell, Menüpunkte mit aktivem Zustand (heller Balken + 3 px Koralle links, `aria-current="page"`), Hover, sichtbarer Fokus (`focus-visible:outline-nav-text`), Badges `bg-nav-badge-bg text-nav-badge-fg`, Profilbereich unten (Initialen-Kreis). Herzschlag-Klassen aus N7 unverändert anhängen. Gilt identisch im Sheet (`MobilLeiste`).
- [ ] **Layout** `app/admin/layout.tsx`: Arbeitsfläche `bg-bg`; Inhalts-`main` je Seite mit `p-4 lg:p-6`, `gap-4`; keine Datenänderung.
- [ ] **Drawer**: Kopf wie `PanelKopf` (Titel Fraunces, optionaler Chip-Slot, Schliessen-Knopf mit `aria-label`), Inhalt scrollt, optionaler fixierter Fussbereich (`fuss?: ReactNode`), Handy volle Breite (N7 beibehalten).
- [ ] **Fehlerseite** im Panel-Stil (Texte unverändert).
- [ ] Checks; Commit `feat(admin-ui): Markenleiste, Seitenkopf und Grundgerüst`.

---

### Task 3: Matches und Zahlen

**Files:** `app/admin/page.tsx`, `components/matches/*`, `app/admin/zahlen/page.tsx`, `components/zahlen/*`

- [ ] Matches: `Seitenkopf` (titel „Matches“, kontext `kontextMatches`), Panel „Bestandspuls“ mit EKG (PulsHero-Logik unverändert) + drei `Kennzahl` (ton über `pulsTon`), „Neue Treffer“ als Panel mit einheitlichen Karten (MatchCard: Objekt/Anfrage, Score, Kriterien als `StatusChip`, „Angebot entwerfen“ primär — Handler unverändert), „Lange nichts gehört“ als Panel mit `ListenZeile`n + „Nachfass entwerfen“; `Leerzustand` wo leer. MatchDetail/Drawer auf neuen Drawer-Kopf.
- [ ] Zahlen: `Seitenkopf` (kontext bleibt die N7-Zeitraumzeile), Kacheln → `Kennzahl`, Diagramm-Karten → `Panel`+`PanelKopf`, Gruppen mit `Abschnittstitel` „Nachfrage“, „Kommunikation“, „Objekte“ (Reihenfolge laut Spec §3). Diagrammlogik unverändert.
- [ ] Checks; Commit `feat(admin-ui): Matches und Zahlen im neuen Aufbau`.

---

### Task 4: Postfach

**Files:** `app/admin/postfach/page.tsx`, `components/postfach/*`

- [ ] `Seitenkopf` mit Hauptaktion „Jetzt abrufen“ (bisheriger PostfachKopf-Knopf wandert in den Seitenkopf; Logik/Handler/`disabled` unverändert) und Abruf-Status als Kontextzeile.
- [ ] Listen-Panel: Filter als Segment-Leiste (`role="tablist"`-artig oder Knopfgruppe mit `aria-pressed`, wie bisher funktional), Kategorie-Chips, `NachrichtZeile` → `ListenZeile` (ungelesen, ausgewählt, Badges „N Bilder“, KI-Symbol).
- [ ] Detail-Panel: Kopf (Absender, Betreff, Datum, `StatusChip` Kategorie/Quelle), Abschnitte mit `Abschnittstitel`: Nachricht, Anhänge (Galerie unverändert in Funktion), KI-Einordnung (nur Mail, wie bisher), Aktionen (Primär/Sekundär nach Bedeutung, gefährliche Aktionen `gefaehrlich`). Alle Aktionsblöcke (Suchanfrage, Antwort, Objektangebot, Objektanfrage) behalten ihre Knöpfe und Texte.
- [ ] Zurück-zur-Liste (N7) bleibt.
- [ ] Checks; Commit `feat(admin-ui): Postfach im neuen Aufbau`.

---

### Task 5: Entwürfe

**Files:** `app/admin/entwuerfe/page.tsx`, `components/entwuerfe/*`

- [ ] `Seitenkopf` (kontext `kontextEntwuerfe`, Hauptaktion „Neue Mail“ öffnet den bestehenden Dialog).
- [ ] Liste gruppiert mit `Abschnittstitel` je Typ, Zeilen als `ListenZeile` (Bezug als Unterzeile).
- [ ] Editor-Panel mit `FormFeld`/`EINGABE_KLASSE`, VersandBanner im neuen Stil (Texte unverändert), feste Aktionsleiste unten: Senden `primaer`, Speichern `sekundaer`, Löschen `gefaehrlich` (Bestätigungen unverändert).
- [ ] Checks; Commit `feat(admin-ui): Entwuerfe im neuen Aufbau`.

---

### Task 6: Anfragen und Objekte

**Files:** `app/admin/anfragen/page.tsx`, `components/anfragen/*` (AnfrageDetail aufteilen < 200 Zeilen), `app/admin/objekte/page.tsx`, `components/objekte/*`

- [ ] Anfragen: `Seitenkopf` (kontext `kontextAnfragen`, Hauptaktion „Anfrage anlegen“ — bestehender Auslöser), Tabelle über `Tabelle` mit Puls-Punkt und `StatusChip` (`anfrageStatusTon`), N7-Sticky-Spalte beibehalten; Drawer mit Abschnitten Eckdaten, Bester Treffer, Verlauf, Bearbeiten; Formularfelder über `FormFeld`.
- [ ] Objekte: `Seitenkopf` (kontext `kontextObjekte`, Hauptaktion „Objekt anlegen“), Raster mit einheitlichen Objektkarten (Titelbild, Titel, Eckdaten, `StatusChip` via `objektStatusTon`, Direktanfragen/neue Treffer, „nicht öffentlich“-Symbol mit `aria-label`); Drawer mit Abschnitten Eckdaten, Beschreibung, Sichtbarkeit, Fotos (Fotos-Funktionen unverändert).
- [ ] Checks; Commit `feat(admin-ui): Anfragen und Objekte im neuen Aufbau`.

---

### Task 7: Nutzer, Profil, Anmelde-Seiten

**Files:** `app/admin/nutzer/page.tsx`, `components/nutzer/*`, `app/admin/profil/page.tsx`, `components/profil/*`, `app/(auth)/{login,passwort-vergessen,passwort-setzen}/page.tsx`, `app/(auth)/layout.tsx`, `app/auth/bestaetigen/page.tsx`, `components/auth/*`, neu `components/auth/AnmeldeRahmen.tsx`

- [ ] Nutzer: `Seitenkopf` (kontext `kontextNutzer`, Hauptaktion „Neues Konto“ öffnet das bestehende Formular-Panel), Tabelle mit Initialen-Avatar, Name, E-Mail (umbrechend), `StatusChip` (eingeladen/aktiv/deaktiviert), Haken-Anzeige, bestehende Aktionen (Deaktivieren gefährlich, Bestätigungen unverändert).
- [ ] Profil: zwei Panels (Name, Passwort ändern) in `max-w-3xl`, Felder über `FormFeld`.
- [ ] `AnmeldeRahmen({ titel, children })`: Desktop zweigeteilt (links Markenfläche `from-nav-von to-nav-bis` mit HerzLogo hell, „Gewerbeflächen mit Herzschlag.“, eine Zeile), rechts Panel mit Formular; Handy Markenstreifen oben. Login, Passwort vergessen/setzen und Bestätigen-Seite nutzen ihn; Felder, Handler, Meldungen, `method`/`action` unverändert.
- [ ] Alten `components/layout/Header.tsx` löschen, wenn keine Aufrufer mehr (`grep`).
- [ ] Checks; Commit `feat(admin-ui): Nutzer, Profil und Anmelde-Seiten`.

---

### Task 8: Gesamtprüfung, Push

- `npm run lint && npx tsc --noEmit && npm run test && npm run build && npm audit --omit=dev`.
- Funktionsgleichheit: `git diff main -- app/actions lib/queries` → leer; `git diff main --stat -- lib` nur neue Dateien `lib/ui/*`, `lib/admin/*`.
- Jede Admin-Seite nutzt `Seitenkopf`; kein Aufruf von `components/layout/Header` mehr.
- Push.

### Task 9: Live-Test (Controller + Davide), Merge

- Jede Seite hell/dunkel, Handy-Breite (Davide per DevTools), reduzierte Bewegung.
- Abläufe einmal durchklicken: Postfach-Auswahl + eine Aktion (z. B. Antwort entwerfen), Entwurf speichern/löschen (Test-Entwurf), Objekt öffnen/bearbeiten und zurücksetzen, Anfrage öffnen, Nutzer-Liste, Login/Logout, Passwort-vergessen-Seite.
- Aufräumen; Davides OK → Merge.

## Abnahme

- Alle Admin- und Anmelde-Seiten im neuen, einheitlichen Aufbau; alle Funktionen unverändert.
- Hell/Dunkel lesbar, Handy ab 360 px ohne horizontales Scrollen, reduzierte Bewegung statisch.
