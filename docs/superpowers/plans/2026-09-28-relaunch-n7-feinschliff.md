# Relaunch N7 · Zahlen mit Diagrammen, Puls-Effekte im Admin, Feinschliff, Handy-Ansicht — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin/zahlen` zeigt alle Kennzahlen aus echten Daten als Diagramme (shadcn-Charts/Recharts, hell/dunkel). Der Admin hat Puls-Effekte (Bestandspuls, kurzer Herzschlag bei neu eingegangenen Mails). Der ganze Admin-Bereich ist auf Handybreite bedienbar. Offene Politur-Punkte aus N4–N6 sind erledigt.

**Architecture:** Kennzahlen werden serverseitig aus Rohzeilen (Server-Client, RLS „aktives Konto“) in **reinen, getesteten Aggregationsfunktionen** berechnet; die Seite übergibt fertige Reihen an kleine Client-Diagramm-Komponenten (Recharts über das shadcn-`chart`-Muster, Farben aus den Tokens). Der belegte Speicher kommt aus einer SQL-Funktion `speicher_belegt()` (security definer, nur `service_role`), aufgerufen über den Admin-Client nach Login-Prüfung. Im Admin-Layout wird die Seitenleiste unter `lg` zu einem Sheet mit oberer Leiste. Der Herzschlag bei neuen Mails hängt am bestehenden `MailAbrufer`-Ergebnis.

**Tech Stack:** Next.js 15.5, React 19.1, Tailwind v4, shadcn, `recharts` 3.10.1, Supabase, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-26-relaunch-design.md` — Abschnitt 3 (`/admin/zahlen`, Seitenleiste), 4 (Puls-Effekte, reduzierte Bewegung, responsiv), 5 (Tests), Meilenstein N7, Abnahme.

## Global Constraints

- Alle Regeln aus N1–N6: Namen deutsch, kein `any`, Dateien < 200 Zeilen, Datenzugriff in `lib/queries/`, kurze Warum-Kommentare, jede Admin-Action prüft zuerst `holeEigenesProfil()`.
- **Keine festen Beispielwerte**: jede Zahl kommt aus echten Daten; fehlen Daten, zeigt die Kachel/das Diagramm einen Leerzustand („Noch keine Daten“), keine 0, die als Aussage gelesen würde.
- Diagramme: vor dem ersten Diagramm-Code die `dataviz`-Skill lesen und befolgen (Skill-Tool). Farben nur über Tokens (`--brand`, `--brand-2`, `--navy`, `--heart`, `--good`, `--warn`, `--crit`, Neutrale), lesbar in hell und dunkel; Achsen/Tooltips auf Deutsch, Zahlen mit Schweizer Tausendertrennzeichen ohne `Intl`-Hydrationsfallen (vorhandenes `formatZahl`).
- Alle Animationen respektieren `prefers-reduced-motion`.
- Admin auf 360–400 px Breite ohne horizontales Seiten-Scrollen bedienbar (breite Tabellen scrollen in ihrem eigenen Container).
- Neue SQL-Funktion: `security definer`, fester `search_path`, `revoke … from public, anon, authenticated`, nur `service_role`.
- Neue Pakete exakt pinnen, `npm audit --omit=dev` ohne high/critical.
- Nichts wird automatisch gesendet.
- Commits enden mit Leerzeile und exakt:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01CbSKvzEHCKZUWFsZgFgstd`
- Branch `feature/n7-feinschliff`, Worktree `.worktrees/n7`. Blockierte Befehle: BLOCKED melden.

---

### Task 1: Migration, Recharts, Chart-Baustein (Controller + Implementer)

**Files:** `supabase/migrations/20260928100000_n7_zahlen.sql`, `package.json`, `components/shadcn/chart.tsx`, `types/database.ts` (Controller)

- [ ] Migration (Controller spielt ein, erzeugt Typen):

```sql
-- Relaunch N7: belegter Speicher für die Kennzahlen-Seite.
create function speicher_belegt() returns table (bucket text, bytes bigint)
language sql security definer stable set search_path = storage, public, pg_temp as $$
  select bucket_id::text, coalesce(sum((metadata->>'size')::bigint), 0)::bigint
  from storage.objects group by bucket_id
$$;
revoke execute on function speicher_belegt() from public, anon, authenticated;
grant execute on function speicher_belegt() to service_role;
```

- [ ] `npm install --save-exact recharts@3.10.1`, `npm audit --omit=dev`.
- [ ] `components/shadcn/chart.tsx` im shadcn-Stil (ChartContainer mit CSS-Variablen je Serie, ChartTooltip/ChartTooltipContent, ChartLegend), angepasst an unsere Tokens; keine Standard-shadcn-Farben (`--chart-1…`) ohne Zuordnung zu unseren Tokens.
- [ ] Checks; Commit `feat: Speicher-Funktion, Recharts und Chart-Baustein`.

---

### Task 2: Aggregationen (TDD)

**Files:** `lib/zahlen/*.ts` (+Tests), je Kennzahl eine kleine reine Funktion

**Interfaces (Produces)** — alle rein, Eingaben sind Rohzeilen, `jetzt: Date` als Parameter (testbar):
```ts
anfragenProMonat(anfragen: { created_at: string; quelle: string }[], jetzt: Date, monate = 12): { monat: string /* "2026-09" */; label: string /* "Sep 26" */; mail: number; website: number; manuell: number }[]
vermittlungsquote(anfragen: { status: string }[]): { quote: number | null; vermittelt: number; gesamt: number }   // null ohne Anfragen
tageBisErstangebot(paare: { anfrage_erstellt: string; gesendet_am: string }[]): { median: number | null; schnitt: number | null; anzahl: number }
entwuerfeVerlauf(entwuerfe: { richtung: string; created_at: string; gesendet_am: string | null; geloescht_am: string | null }[], jetzt: Date, monate = 6): { monat; label; gesendet: number; geloescht: number }[]
mailsProWoche(nachrichten: { richtung: string; quelle: string | null; empfangen_am: string | null; created_at: string; gesendet_am: string | null }[], jetzt: Date, wochen = 12): { woche: string /* ISO-Woche "2026-W39" */; label: string /* "KW 39" */; ein: number; aus: number }[]
topObjekte(anfragen: { objekt_id: string | null }[], titel: Record<string, string>, max = 5): { titel: string; anzahl: number }[]   // Direktanfragen (kategorie objektanfrage)
groessenVerteilung(anfragen: { flaeche_min: number | null; flaeche_max: number | null }[]): { bereich: string; anzahl: number }[]   // feste Klassen: <200, 200–499, 500–999, 1000–2499, ≥2500, unbekannt
nutzungVerteilung(anfragen: { nutzung: string }[]): { nutzung: string; label: string; anzahl: number }[]
pulsVerteilung(offene: { letzter_kontakt: string }[], jetzt: Date): { gut: number; warn: number; kritisch: number }   // lib/puls.ts wiederverwenden (dafür puls() um optionales `jetzt` erweitern, abwärtskompatibel)
speicherAnteil(buckets: { bucket: string; bytes: number }[], grenzeBytes = 1_073_741_824): { belegt: number; anteil: number; nachBucket: { bucket: string; bytes: number }[] }
formatBytes(n: number): string   // "12.3 MB", "1.02 GB"
```
Tests: Monats-/Wochengrenzen (Jahreswechsel, ISO-Woche 53/1, Zeitzone Europe/Zurich), leere Eingaben → Leerwerte, unbekannte Quellen/Nutzungen, Median bei gerader/ungerader Anzahl, negative Zeitspannen ignoriert, Klassenzuordnung (Mitte von min/max, nur min, nur max).

- [ ] RED → GREEN; Checks; Commit `feat: Kennzahlen als reine Aggregationen`.

---

### Task 3: `/admin/zahlen` mit Diagrammen

**Files:** `lib/queries/zahlen.ts` (neu schreiben), `app/admin/zahlen/page.tsx`, `components/zahlen/*`

- [ ] Queries: je Quelle eine schlanke Abfrage (nur benötigte Spalten), Paging über 1000 Zeilen (`.range()`-Schleife wie in `lib/queries/fotos.ts`), `speicher_belegt()` über den Admin-Client (server-only) nach `holeEigenesProfil()` im Seiten-Aufruf; gelöschte Nachrichten nur dort mitzählen, wo es die Kennzahl verlangt (Entwürfe gelöscht).
- [ ] Seite: Kopf mit Zeitraum-Hinweis; Kacheln (Anfragen gesamt/offen, Vermittlungsquote, Tage bis Erstangebot (Median), Speicher belegt mit Balken); Diagramme: Anfragen pro Monat nach Quelle (gestapelte Säulen), Mails ein/aus pro Woche (Linien oder gruppierte Säulen), Entwürfe gesendet vs. gelöscht (Säulen), Top-Objekte nach Direktanfragen (liegende Balken), gesuchte Grössen (Säulen) und Nutzungsarten (liegende Balken), Puls-Verteilung (gestapelter Balken gut/warn/kritisch in den Puls-Farben). Jedes Diagramm mit Titel, kurzer Beschreibung und Leerzustand; auf Handybreite eine Spalte.
- [ ] Die alte Kachel „Nacharbeit / Tag“ (fester Beispielwert) entfällt.
- [ ] Checks; Commit `feat: Kennzahlen-Seite mit Diagrammen aus echten Daten`.

---

### Task 4: Puls-Effekte im Admin

**Files:** `components/layout/MailAbrufer.tsx`, `lib/postfach-abruf.ts`, `components/layout/Sidebar.tsx`, `components/matches/PulsHero.tsx`, neue kleine Client-Komponente(n)

- [ ] Herzschlag bei neuen Mails: Liefert eine Abrufrunde `neu > 0`, schlägt das Herz im Sidebar-Logo zweimal kräftig (CSS-Klasse für ~1,5 s), das Postfach-Badge pulsiert kurz, und ein Toast „N neue Mails“ mit Link „Postfach öffnen“ erscheint (nur wenn der Nutzer nicht bereits im Postfach ist; dort genügt der Herzschlag). Umsetzung über ein kleines Ereignis (z. B. `window.dispatchEvent(new CustomEvent("immoheart:neue-mails", { detail: { neu } }))`) oder einen React-Kontext — Implementer entscheidet, testbar halten.
- [ ] Bestandspuls (`PulsHero`): EKG-Linie läuft sanft (Strich-Animation), Tempo abhängig vom Durchschnittspuls (gesund = ruhig, kritisch = schneller), Live-Punkt pulsiert; reduziert: statisch.
- [ ] Alle Effekte `prefers-reduced-motion`-fest.
- [ ] Checks; Commit `feat: Herzschlag bei neuen Mails und lebendiger Bestandspuls`.

---

### Task 5: Admin auf Handybreite

**Files:** `app/admin/layout.tsx`, `components/layout/{Sidebar,Header,MobilLeiste}.tsx`, betroffene Ansichten (`components/postfach/*`, `components/anfragen/*`, `components/objekte/*`, `components/entwuerfe/*`, `components/nutzer/*`, `components/layout/Drawer.tsx`)

- [ ] Unter `lg`: Seitenleiste ausgeblendet, obere Leiste mit Menü-Knopf (öffnet die Seitenleiste als shadcn-`Sheet`, schliesst bei Navigation), Seitentitel, Theme-Umschalter; Badges bleiben sichtbar (am Menü-Knopf ein Punkt, wenn ungelesene Mails/offene Entwürfe).
- [ ] Postfach/Entwürfe: Liste und Detail untereinander; nach Auswahl scrollt die Ansicht zum Detail, ein „Zurück zur Liste“-Link führt zurück.
- [ ] Anfragen-Tabelle: horizontales Scrollen im eigenen Container, wichtigste Spalten zuerst; Drawer (Objekte/Anfragen) auf Handy volle Breite.
- [ ] Alle Admin-Seiten bei 375 px ohne horizontales Seiten-Scrollen (per Dev-Server + curl nicht prüfbar → Implementer prüft Klassen systematisch; Controller prüft live im Browser mit schmalem Fenster).
- [ ] Checks; Commit `feat: Admin-Bereich auf Handybreite`.

---

### Task 6: Politur aus N4–N6

- [ ] „Übernehmen“ (Antwort-Vorschläge im Postfach) nur für Felder anbieten, deren Wert sich von der Anfrage unterscheidet.
- [ ] `MailAbrufer`: `letzterLauf` nur setzen, wenn die Runde tatsächlich lief (war N4-Minor; prüfen, ob in N4-Final bereits erledigt).
- [ ] Suchauftrag-Formular: Rasterlücke („Bezug ab“ allein in der letzten Zeile) schliessen.
- [ ] `formular_limits`: alte Fenster (älter als 1 Tag) beim Zählen gelegentlich löschen (z. B. in der RPC `formular_zaehlen` per zusätzlichem `delete … where fenster_start < now() - interval '1 day'`, als additive Migration `create or replace function`), damit die Tabelle nicht wächst.
- [ ] Checks; Commit `chore: Politur aus N4 bis N6`.

---

### Task 7: Gesamtprüfung, Push

- `npm run lint && npx tsc --noEmit && npm run test && npm run build && npm audit --omit=dev`.
- `grep -rn "nacharbeitProTag\|: 11," lib app components` → keine festen Beispielwerte.
- Push.

### Task 8: Live-Test (Controller + Davide), Merge

- `/admin/zahlen` hell/dunkel: alle Diagramme mit echten Daten oder Leerzustand, Tooltips deutsch, keine Überläufe.
- Neue Mail (Davide sendet eine) → Herzschlag im Logo, Badge, Toast.
- Admin bei schmalem Fenster (Chrome-Fenster auf ~400 px oder DevTools-Emulation durch Davide): Menü, Postfach Liste↔Detail, Anfragen-Tabelle, Objekt-Drawer.
- Aufräumen; Davides OK → Merge.

## Abnahme N7 (= Spec-Meilenstein)

- Alle Kennzahlen aus echten Daten, keine festen Beispielwerte.
- Keine Seite bricht auf Handybreite.
- Puls-Effekte im Admin, bei reduzierter Bewegung statisch.
