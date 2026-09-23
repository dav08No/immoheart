# PULS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build PULS, the internal webapp for espaceSOLOTHURN, as specified in `README.md` and `docs/superpowers/specs/2026-09-22-puls-design.md` — matching against the object stock in both directions, with AI-assisted mail reading and draft preparation, deployed continuously to Vercel from day one.

**Architecture:** Next.js App Router (TypeScript strict) with Server Components as the default, Supabase (Postgres + Auth + RLS) as the only backend, Tailwind CSS with design tokens lifted verbatim from `docs/puls-cockpit-v5.html`. Two deterministic, unit-tested TypeScript modules (`lib/puls.ts`, `lib/matching.ts`) carry all scoring logic — no database functions, no Edge Functions. A separate `lib/ki/` layer handles the two language-shaped tasks a pure function cannot: reading raw email text into structured fields, and drafting prose for follow-up/offer/nudge emails. GitHub Actions gates every push and PR (lint, typecheck, test, build); Vercel's Git integration deploys previews from PRs and production from `main`.

**Tech Stack:** Next.js (App Router), TypeScript strict, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Tailwind CSS, Vitest, `@google/genai` (Gemini, free tier), GitHub Actions, Vercel. No state library, no ORM, no component library, no form framework, no chart library.

**Spec:** `docs/superpowers/specs/2026-09-22-puls-design.md` (deployment/CI-CD/KI decisions) and `README.md` (domain model, matching weights, views, design tokens, roles). Both travel with this plan — task descriptions reference them by section rather than repeating them.

## Global Constraints

Copied verbatim from the spec and README; every task's requirements implicitly include these:

- Node 20+, TypeScript strict, **no `any`** anywhere in the project.
- Keine Abstraktion vor der dritten Wiederholung (rule of three).
- Eine Datei, eine Aufgabe — Richtwert unter 200 Zeilen pro Komponente.
- Datenzugriff ausschliesslich in `lib/queries/`, nie direkt in einer Komponente.
- Server Components als Standard; `"use client"` nur bei echter Interaktivität (Drawer, Formulare, Filter).
- Schreibende Operationen ausschliesslich als Server Actions in `app/actions/`.
- Fachbegriffe deutsch (`Anfrage`, `Objekt`, `Match`, `Nachricht`, `Regel`, `puls`); Technisches englisch (`getAnfragen`, `MatchCard`).
- Kommentare nur wo das *Warum* nicht offensichtlich ist.
- Automatisierte Tests **nur** für `lib/puls.ts`, `lib/matching.ts`, und die reinen Prompt-Bau-/Antwort-Parse-Funktionen in `lib/ki/*` (Spec D9). Keine UI-Tests.
- `main` muss jederzeit deploybar sein (Spec D2); Feature-Branches, Merge per Pull Request.
- Der Vercel-Build muss ohne gesetzte Umgebungsvariablen gelingen (Spec D3) — Supabase-Clients werden pro Aufruf erzeugt, nie als Modul-Singleton beim Import.
- `SUPABASE_SERVICE_ROLE_KEY` und `GEMINI_API_KEY` sind ausschliesslich serverseitig, nie mit `NEXT_PUBLIC_`-Präfix, nie im Repository.
- Farbtoken exakt aus dem Prototyp: `--primary:#065A82 --secondary:#1C7293 --navy:#21295C --bg:#EEF2F5 --surface:#FFFFFF --surface-2:#F7F9FA --ink:#1F2429 --ink-2:#5A6472 --ink-3:#98A2AE --line:#E1E7EC --good:#0F6E56/#F0F6F3 --warn:#A85D14/#FDF3E3 --crit:#9B3232/#F8EBEB`. Dunkelmodus-Basis `#161A33`/`#1E2447`. Eckenradius 10px, keine Schatten ausser beim Drawer.
- Überschriften/Zahlen in Cambria (Fallback Georgia, serif), alles andere in Outfit über `next/font`.
- Freigabestufen (`profiles.freigabe_stufe`) werden **serverseitig** in der Server Action geprüft, nie nur in der Oberfläche.
- Kein echter Mailversand — „Senden" setzt `gesendet_am`, es geht keine echte E-Mail raus.
- Matching (`lib/matching.ts`) bleibt rein deterministisch (Spec D8); die KI (`lib/ki/`) übernimmt nur Text-Extraktion und Mail-Formulierung, nie das Scoring.

## File Structure

```
app/
  layout.tsx                      Root-Layout, next/font-Setup
  globals.css                     Design-Tokens als CSS-Variablen, Tailwind-Layer
  (auth)/login/page.tsx           Anmeldung
  (app)/
    layout.tsx                    Seitenleiste + Kopfzeile + Drawer-Host
    page.tsx                      Matches (Startseite)
    postfach/page.tsx
    anfragen/page.tsx
    objekte/page.tsx
    regeln/page.tsx
    zahlen/page.tsx
  actions/
    anfragen.ts  objekte.ts  matches.ts  nachrichten.ts  regeln.ts  profile.ts
components/
  layout/      Sidebar.tsx, Header.tsx, Drawer.tsx, FreigabeSchalter.tsx
  matches/     PulsHero.tsx, MatchCard.tsx, MatchDetail.tsx
  postfach/    NachrichtenListe.tsx, EingangDetail.tsx, EntwurfDetail.tsx, MailEinfuegen.tsx
  anfragen/    AnfragenTabelle.tsx, AnfrageDetail.tsx, AnfrageFormular.tsx
  objekte/     ObjektRaster.tsx, ObjektFormular.tsx
  ui/          Button.tsx, Chip.tsx, Card.tsx, Feld.tsx
lib/
  supabase/    client.ts, server.ts
  queries/     anfragen.ts, objekte.ts, matches.ts, nachrichten.ts, regeln.ts, profile.ts
  ki/          erkennung.ts, entwuerfe.ts
  matching.ts
  puls.ts
  format.ts
types/
  database.ts  (generiert)
  index.ts     (abgeleitete Typen)
supabase/
  migrations/  *.sql
  seed.sql
.github/workflows/
  ci.yml
  keep-alive.yml
```

`components/postfach/MailEinfuegen.tsx` ist eine Ergänzung zum README-Baum: sie trägt den in der Spec (D7) beschriebenen Einfügen-Dialog für Mail-Rohtext — eine eigene Datei, weil sie eine eigene Aufgabe hat (Formular, nicht Anzeige).

## Zwei offene Annahmen, die dieser Plan trifft

Diese sind nicht im README oder in der Spec explizit entschieden; sie werden hier einmal festgehalten, damit jede Aufgabe darauf verweisen kann, statt sie zu wiederholen.

**A1 · Ausschlussregeln (`regeln`) werden protokolliert, nicht automatisch ausgewertet.** Das README verlangt für `berechneMatch`: „Rückgabe `null`, wenn eine aktive Ausschlussregel greift oder der Score unter 60 liegt." Der Prototyp selbst wertet die sechs Beispielregeln (R-01…R-06) an keiner Stelle im Code aus — sie sind Freitext ohne maschinenlesbare Bedingung, nur mit Anwendungszähler. Ein Freitext wie „Laute Nutzungen nicht in die Altstadt" lässt sich ohne strukturiertes Regel-Format nicht generisch gegen eine Anfrage/Objekt-Kombination prüfen. Dieser Plan implementiert deshalb nur den score-basierten Ausschluss (`< 60`) und behandelt `regeln` als Log der Verwerfen-Gründe, exakt wie im Prototyp. Ein strukturiertes Regel-Format wäre eine separate, grössere Erweiterung — hier bewusst nicht gebaut (YAGNI).

**A2 · Freigabestufe für Nachfass-Entwürfe folgt derselben Schwelle wie Rückfragen.** Das README nennt für Stufe 2 nur „Rückfragen bei fehlenden Angaben" als automatisch versendet. Nachfass-Mails („Lange nichts gehört") sind vom Charakter her ebenfalls informationsanfordernd statt anbietend; dieser Plan behandelt sie deshalb wie Rückfragen (automatischer Versand ab Stufe 2), während Angebote weiterhin erst ab Stufe 3 automatisch gehen.

---

## Meilenstein M0 · Grundgerüst, CI, Deployment

### Task 1: Next.js-Grundgerüst von Hand anlegen

Das Repo enthält bereits `README.md`, `docs/`, `.git` — `create-next-app` verweigert in nicht-leeren Verzeichnissen. Die Dateien werden deshalb direkt angelegt.

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `next-env.d.ts`
- Create: `.gitignore`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

**Interfaces:**
- Produces: das lauffähige Next.js-Grundgerüst, auf dem jede spätere Task aufbaut.

- [ ] **Step 1: `package.json` anlegen**

```json
{
  "name": "puls",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest run",
    "types": "supabase gen types typescript --project-id rvxlvrrpltmuzuomdwdf > types/database.ts"
  },
  "dependencies": {
    "next": "15.5.25",
    "react": "19.1.1",
    "react-dom": "19.1.1",
    "@supabase/supabase-js": "2.58.0",
    "@supabase/ssr": "0.7.0",
    "@google/genai": "1.30.0"
  },
  "devDependencies": {
    "typescript": "5.7.3",
    "@types/node": "22.10.5",
    "@types/react": "19.1.1",
    "@types/react-dom": "19.1.1",
    "tailwindcss": "3.4.17",
    "postcss": "8.4.49",
    "autoprefixer": "10.4.20",
    "eslint": "9.39.5",
    "eslint-config-next": "15.5.25",
    "vitest": "2.1.9"
  }
}
```

Versionen aktualisiert gegenüber der ersten Fassung dieses Plans (siehe Task 1 im Ledger für den Befund): `next` und `eslint-config-next` patchen eine kritische RCE- und mehrere DoS-Schwachstellen aus dem npm-Advisory-Feed, `eslint` und `vitest` schliessen kleinere, nur entwicklungsseitig relevante Lücken. Ein Sprung auf `next@16` oder `vitest@5` (die `npm audit fix --force` vorschlägt) wird bewusst nicht gemacht — beides sind Major-Versionen mit Breaking Changes, die grosse Teile dieses Plans ungültig machen würden, gegen ausschliesslich entwicklungsseitig relevante Restrisiken (Test-Runner-Dev-Server, nie deployed; PostCSS-Sourcemap-Handling zur Build-Zeit ohne fremde Eingaben).

`@anthropic-ai/sdk` wurde nach der ersten Fassung durch `@google/genai` ersetzt (Nutzerwunsch: kostenlose KI-API statt einer kostenpflichtigen). Google Gemini hat ein dauerhaftes kostenloses Kontingent für Flash-Modelle, während Anthropic keine laufend kostenlose Produktivstufe anbietet. Betrifft `lib/ki/erkennung.ts` (M5, Task 37) und `lib/ki/entwuerfe.ts` (M5, Task 38) sowie die Umgebungsvariable — überall `ANTHROPIC_API_KEY` → `GEMINI_API_KEY`.

- [ ] **Step 2: `tsconfig.json` anlegen**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: `next.config.ts` anlegen**

```ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {}

export default nextConfig
```

- [ ] **Step 4: `next-env.d.ts` anlegen**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 5: `.gitignore` anlegen**

```
node_modules
.next
.env.local
*.tsbuildinfo
```

`types/database.ts` ist zwar generiert (per `npm run types`), wird aber trotzdem **committet** (Korrektur gegenüber der ersten Fassung dieses Plans — siehe Task 9 im Ledger für den Befund): Ein frischer Checkout ohne diese Datei lässt `next build` mit „Cannot find module '@/types/database'" fehlschlagen, und den Vercel-Build zusätzlich vom Supabase-CLI abhängig zu machen wäre mehr Komplexität als nötig. Nach jeder Schemaänderung wird sie über `npm run types` neu erzeugt und neu committet.

- [ ] **Step 6: `app/globals.css` mit den Design-Tokens anlegen**

Werte 1:1 aus `docs/puls-cockpit-v5.html:11-33` übernommen.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #EEF2F5; --surface: #FFFFFF; --surface-2: #F7F9FA; --surface-3: #EAF2F7;
  --ink: #1F2429; --ink-2: #5A6472; --ink-3: #98A2AE;
  --line: #E1E7EC; --line-2: #CFD8E0;
  --brand: #065A82; --brand-2: #1C7293; --on-brand: #FFFFFF; --brand-soft: #EAF2F7;
  --navy: #21295C;
  --good: #0F6E56; --good-bg: #F0F6F3;
  --warn: #A85D14; --warn-bg: #FDF3E3;
  --crit: #9B3232; --crit-bg: #F8EBEB;
}

:root[data-theme="dark"] {
  --bg: #161A33; --surface: #1E2447; --surface-2: #262C55; --surface-3: #2E3560;
  --ink: #EEF2F7; --ink-2: #B8C2D4; --ink-3: #8792AB;
  --line: #333A66; --line-2: #414A7A;
  --brand: #8CBFDC; --brand-2: #A8D2EA; --on-brand: #0E1330; --brand-soft: #29315C;
  --navy: #0E1330;
  --good: #5DCAA5; --good-bg: #1A3B33;
  --warn: #E5B23C; --warn-bg: #3A2E14;
  --crit: #F0908B; --crit-bg: #3D2020;
}

body {
  background: var(--bg);
  color: var(--ink);
}
```

- [ ] **Step 7: `app/layout.tsx` mit Fonts anlegen**

Cambria ist eine Systemschrift (Fallback Georgia) — kein `next/font`-Eintrag nötig, nur die CSS-Stack. Outfit kommt über `next/font/google`.

```tsx
import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import "./globals.css"

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" })

export const metadata: Metadata = {
  title: "PULS",
  description: "Vermittlung von Gewerbeimmobilien für espaceSOLOTHURN",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${outfit.variable} font-sans`}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 8: `app/page.tsx` als Platzhalter anlegen**

Wird in M8 durch die echte Matches-Startseite ersetzt.

```tsx
export default function Home() {
  return <main className="p-6">PULS</main>
}
```

- [ ] **Step 9: Abhängigkeiten installieren**

Run: `npm install`
Expected: `node_modules/` wird erzeugt, `package-lock.json` entsteht, kein Fehler.

- [ ] **Step 10: Dev-Server probeweise starten**

Run: `npm run dev` (danach mit Strg+C beenden, sobald „Ready" erscheint)
Expected: Server startet auf Port 3000 ohne Fehler.

- [ ] **Step 11: Commit**

```bash
git checkout -b feature/m0-grundgeruest
git add package.json package-lock.json tsconfig.json next.config.ts next-env.d.ts .gitignore app/
git commit -m "feat: Next.js-Grundgerüst mit Design-Tokens anlegen"
```

---

### Task 2: Tailwind konfigurieren und Tokens einbinden

**Files:**
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`

**Interfaces:**
- Consumes: CSS-Variablen aus `app/globals.css` (Task 1, Step 6).
- Produces: Tailwind-Utilities (`bg-brand`, `text-ink-2`, `rounded-card`, `font-display`, `font-sans`), die jede spätere Komponente verwendet.

- [ ] **Step 1: `tailwind.config.ts` anlegen**

```ts
import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        line: "var(--line)",
        "line-2": "var(--line-2)",
        brand: "var(--brand)",
        "brand-2": "var(--brand-2)",
        "on-brand": "var(--on-brand)",
        "brand-soft": "var(--brand-soft)",
        navy: "var(--navy)",
        good: "var(--good)",
        "good-bg": "var(--good-bg)",
        warn: "var(--warn)",
        "warn-bg": "var(--warn-bg)",
        crit: "var(--crit)",
        "crit-bg": "var(--crit-bg)",
      },
      borderRadius: { card: "10px" },
      fontFamily: {
        sans: ["var(--font-outfit)", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["Cambria", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: `postcss.config.js` anlegen**

```js
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

- [ ] **Step 3: Tailwind-Klasse probeweise in `app/page.tsx` verwenden**

```tsx
export default function Home() {
  return <main className="p-6 font-display text-2xl text-brand">PULS</main>
}
```

- [ ] **Step 4: Visuell prüfen**

Run: `npm run dev`, Browser auf `http://localhost:3000` öffnen.
Expected: „PULS" erscheint in Cambria/Serif, in der Markenfarbe `#065A82`.

- [ ] **Step 5: Platzhalter zurücksetzen**

```tsx
export default function Home() {
  return <main className="p-6">PULS</main>
}
```

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts postcss.config.js app/page.tsx
git commit -m "feat: Tailwind mit Design-Tokens aus dem Prototyp verbinden"
```

---

### Task 3: ESLint mit no-explicit-any konfigurieren

**Files:**
- Create: `eslint.config.mjs`

**Interfaces:**
- Produces: `npm run lint`, das jede spätere Task und der CI-Workflow (Task 6) verwenden.

- [ ] **Step 1: `eslint.config.mjs` anlegen**

Der `ignores`-Block ist nötig, obwohl die drei Pfade unauffällig wirken:
`.worktrees/**` verhindert, dass `eslint .` — von der Repo-Wurzel aus
aufgerufen — den vollständigen, auf der Festplatte liegenden Checkout des
aktiven Feature-Branch-Worktrees mitlintet (samt dessen eigenem
`node_modules`); `next-env.d.ts` ist eine von Next.js bei jedem Build
automatisch erweiterte Datei, die nie gelintet werden soll (siehe M0
Task 9 im Ledger für den Befund, der das erst bei einem Checkout aus
main statt aus dem Worktree sichtbar machte).

```js
import { FlatCompat } from "@eslint/eslintrc"

const compat = new FlatCompat({ baseDirectory: import.meta.dirname })

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", ".worktrees/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
]

export default eslintConfig
```

- [ ] **Step 2: @eslint/eslintrc installieren, falls nicht vorhanden**

Run: `npm install --save-dev @eslint/eslintrc`
Expected: kein Fehler, Paket erscheint in `package.json`.

- [ ] **Step 3: Lint laufen lassen**

Run: `npm run lint`
Expected: „No ESLint warnings or errors" (bei den bisher angelegten Dateien).

- [ ] **Step 4: Absichtlich ein any einbauen und prüfen, dass Lint es ablehnt**

In `app/page.tsx` temporär `const x: any = 1` einfügen, `npm run lint` laufen lassen — Expected: FAIL mit `no-explicit-any`. Danach die Zeile wieder entfernen.

- [ ] **Step 5: Commit**

```bash
git add eslint.config.mjs package.json package-lock.json
git commit -m "feat: ESLint mit Verbot von any konfigurieren"
```

---

### Task 4: Vitest konfigurieren

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/format.test.ts` (Platzhalter-Test, wird in M2 durch echten Inhalt ersetzt)

**Interfaces:**
- Produces: `npm run test`, das der CI-Workflow (Task 6) und alle Logik-Tasks in M2/M5 verwenden.

- [ ] **Step 1: `vitest.config.ts` anlegen**

Der `exclude`-Block übernimmt Vitests eigene Standardausschlüsse und
ergänzt `.worktrees/**` — ohne den Zusatz findet Vitest, von der
Repo-Wurzel aus aufgerufen, jede Testdatei doppelt (einmal im Repo,
einmal im dort liegenden Worktree-Checkout des Feature-Branches).

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      ".worktrees/**",
    ],
  },
})
```

- [ ] **Step 2: Sanity-Test schreiben**

```ts
import { describe, expect, it } from "vitest"

describe("Testumgebung", () => {
  it("läuft", () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 3: Test laufen lassen**

Run: `npm run test`
Expected: 1 Test, PASS.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts lib/format.test.ts
git commit -m "feat: Vitest konfigurieren"
```

---

### Task 5: Supabase-Clients anlegen (build-sicher ohne Env-Variablen)

Kritisch für Spec-Entscheidung D3: Der Client darf beim Modulimport keine Umgebungsvariable lesen, sonst schlägt der erste Vercel-Build fehl, bevor die Variablen gesetzt sind.

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `.env.example`

**Interfaces:**
- Produces: `erstelleBrowserClient()` und `erstelleServerClient()`, die ab M1 jede Query- und Action-Datei verwendet.

- [ ] **Step 1: `.env.example` anlegen**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

- [ ] **Step 2: `lib/supabase/client.ts` anlegen (Browser-Client)**

```ts
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"

export function erstelleBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: `lib/supabase/server.ts` anlegen (Server-Client für Server Components/Actions)**

```ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"

export async function erstelleServerClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        },
      },
    }
  )
}
```

Beide Funktionen lesen `process.env` erst bei Aufruf, nicht beim Modulimport — genau der in Spec D3 geforderte Aufbau.

- [ ] **Step 4: `types/database.ts` als Platzhalter anlegen und committen**

Wird in M1, Task 12 durch die echten generierten Typen ersetzt. Anders als
in der ersten Fassung dieses Plans **wird diese Datei committet**, nicht
`.gitignore`d — ein frischer Checkout ohne sie lässt `next build` mit
„Cannot find module '@/types/database'" fehlschlagen (siehe M0 Task 9 im
Ledger). Nach jeder Schemaänderung wird sie über `npm run types` neu
erzeugt und neu committet, nie live beim Build generiert.

```ts
// Generiert via `npm run types` (supabase gen types typescript). Committet,
// damit der Build (Vercel, CI) ohne laufenden Supabase-CLI-Zugriff gelingt —
// diese Datei wird nach jeder Schemaänderung neu erzeugt und neu committet,
// nicht bei jedem Build live generiert.
export type Database = Record<string, never>
```

- [ ] **Step 5: Build probeweise ohne jede Env-Variable laufen lassen**

Run: `npm run build`
Expected: Build gelingt (Fehler würden erst bei tatsächlichem Datenbankzugriff zur Laufzeit auftreten, nicht beim Build) — das bestätigt Spec-Entscheidung D3.

- [ ] **Step 6: Commit**

```bash
git add lib/supabase .env.example types/database.ts
git commit -m "feat: Supabase-Clients ohne Build-Abhängigkeit von Env-Variablen anlegen"
```

---

### Task 6: GitHub Actions CI-Workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `npm run lint`, `npm run test`, `npm run build` (Tasks 1–5).
- Produces: den grünen/roten Haken, den Spec-Entscheidung D1/D2 als Merge-Voraussetzung verlangt.

- [ ] **Step 1: `.github/workflows/ci.yml` anlegen**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm run test
      - run: npm run build
```

- [ ] **Step 2: Committen und pushen, damit Actions erstmals läuft**

```bash
git add .github/workflows/ci.yml
git commit -m "feat: GitHub-Actions-CI (lint, typecheck, test, build)"
git push -u origin feature/m0-grundgeruest
```

- [ ] **Step 3: Pull Request öffnen und CI-Ergebnis prüfen**

Run: `gh pr create --title "M0: Grundgerüst" --body "Next.js, Tailwind, ESLint, Vitest, Supabase-Clients, CI." --base main` (falls `gh` nicht verfügbar ist: PR manuell auf GitHub öffnen)
Expected: Der Workflow „CI" startet automatisch und wird grün.

---

### Task 7: Vercel verbinden (manuell, ausserhalb des Codes)

Dieser Task hat keine Code-Schritte — er dokumentiert, was von Hand im Vercel-Dashboard zu tun ist, weil kein Werkzeug-Zugriff auf Vercel besteht (Spec, „Offene Punkte").

**Interfaces:**
- Consumes: das gepushte Repo (Task 6).
- Produces: eine erreichbare Production-URL, Grundlage für „durchgehend auf Vercel erreichbar".

- [ ] **Step 1: Auf vercel.com/new das Repo importieren**

Framework wird automatisch als Next.js erkannt. Root-Verzeichnis bleibt `.`.

- [ ] **Step 2: Umgebungsvariablen eintragen**

Unter Settings → Environment Variables, für Production und Preview je einmal:
```
NEXT_PUBLIC_SUPABASE_URL=https://rvxlvrrpltmuzuomdwdf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_N-2dRhHasUaPg8dKTuWqaw_UJNtaZRH
SUPABASE_SERVICE_ROLE_KEY=<aus dem Supabase-Dashboard kopiert>
GEMINI_API_KEY=<aus Google AI Studio, kostenloses Kontingent>
```

- [ ] **Step 3: Ersten Deploy abwarten und URL öffnen**

Expected: Die Platzhalterseite „PULS" ist unter der Vercel-URL erreichbar (Build gelingt bereits ohne Datenbankzugriff dank Task 5).

- [ ] **Step 4: Bestätigen, dass ein PR ein Preview-Deployment erzeugt**

Den offenen PR aus Task 6 öffnen — Vercel kommentiert automatisch mit einem Preview-Link. Diesen Link öffnen und prüfen, dass dieselbe Platzhalterseite erscheint.

---

### Task 8: Supabase-Keep-alive gegen die Pausierung

**Files:**
- Create: `.github/workflows/keep-alive.yml`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` als GitHub-Repo-Secrets.
- Produces: regelmässige Datenbankaktivität, die die 7-Tage-Pausierung (Spec D4) verhindert.

- [ ] **Step 1: Secrets im GitHub-Repo hinterlegen**

Unter Settings → Secrets and variables → Actions im Repo:
```
NEXT_PUBLIC_SUPABASE_URL=https://rvxlvrrpltmuzuomdwdf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_N-2dRhHasUaPg8dKTuWqaw_UJNtaZRH
```

- [ ] **Step 2: `.github/workflows/keep-alive.yml` anlegen**

```yaml
name: Supabase Keep-alive

on:
  schedule:
    - cron: "0 6 */2 * *"
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Datenbank anfragen, um Pausierung zu verhindern
        run: |
          curl -sf "${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}/rest/v1/regeln?select=id&limit=1" \
            -H "apikey: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}"
```

Die Abfrage auf `regeln` existiert erst ab M1 wirklich — bis dahin liefert PostgREST einen Fehler auf die noch fehlende Tabelle, was für den Zweck unerheblich ist: Supabase zählt jede eingehende Anfrage an die Datenbank als Aktivität, unabhängig vom Ergebnis.

- [ ] **Step 3: Workflow manuell auslösen und prüfen**

Run: `gh workflow run keep-alive.yml` (oder im Actions-Tab „Run workflow")
Expected: Lauf ist grün, `curl` liefert eine HTTP-Antwort (auch ein Fehlercode zählt als erreichte Anfrage).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/keep-alive.yml
git commit -m "feat: Keep-alive-Job gegen Supabase-Pausierung"
git push
```

---

### Task 9: Meilenstein M0 abschliessen

- [ ] **Step 1: Alle offenen Punkte aus Tasks 1–8 gegen die Checkliste prüfen**

`npm run lint`, `npx tsc --noEmit`, `npm run test`, `npm run build` laufen lokal fehlerfrei. CI ist auf dem PR grün. Vercel liefert die Platzhalterseite in Production und in einem PR-Preview aus. Keep-alive-Workflow ist einmal erfolgreich gelaufen.

- [ ] **Step 2: Pull Request mergen**

Run: `gh pr merge --squash` (oder im GitHub-UI)
Expected: `main` enthält das Grundgerüst, Vercel deployt automatisch die neue Production-Version.

- [ ] **Step 3: Lokalen main aktualisieren**

```bash
git checkout main
git pull
```

---

## Meilenstein M1 · Schema, RLS, Seed

Alle Migrationen werden mit `supabase migration new <name>` erzeugt (echter Zeitstempel im Dateinamen) und dann mit dem angegebenen Inhalt gefüllt. Voraussetzung: `supabase login` und `supabase link --project-ref rvxlvrrpltmuzuomdwdf` einmalig lokal ausgeführt.

### Task 10: Enums und Tabellen

**Files:**
- Create: `supabase/migrations/<timestamp>_schema.sql`

**Interfaces:**
- Produces: alle sieben Tabellen aus dem README-Datenmodell, Grundlage für jede folgende Task.

- [ ] **Step 1: Migration anlegen**

Run: `supabase migration new schema`
Das erzeugt `supabase/migrations/<timestamp>_schema.sql` — dort folgenden Inhalt einfügen:

```sql
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
```

- [ ] **Step 2: Gegen die Cloud-Datenbank anwenden**

Run: `supabase db push`
Expected: „Applying migration <timestamp>_schema.sql..." ohne Fehler.

- [ ] **Step 3: Tabellen im Dashboard prüfen**

Im Supabase-Dashboard unter *Table Editor* — Expected: alle sieben Tabellen sind sichtbar mit den definierten Spalten.

- [ ] **Step 4: Commit**

```bash
git checkout -b feature/m1-schema
git add supabase/migrations
git commit -m "feat: Datenbankschema aus dem README anlegen"
```

---

### Task 11: RLS, `current_rolle()`-Funktion und View `anfragen_sichtbar`

**Files:**
- Create: `supabase/migrations/<timestamp>_rls.sql`

**Interfaces:**
- Consumes: Tabellen und Enums aus Task 10.
- Produces: die Sicherheitsschicht, auf die jede Query-Funktion ab M3 trifft.

- [ ] **Step 1: Migration anlegen**

Run: `supabase migration new rls`

```sql
alter table profiles enable row level security;
alter table firmen enable row level security;
alter table anfragen enable row level security;
alter table objekte enable row level security;
alter table matches enable row level security;
alter table nachrichten enable row level security;
alter table regeln enable row level security;

-- search_path ist Pflicht bei SECURITY DEFINER, keine Feinheit: ohne ihn
-- könnte ein späteres Schema mit CREATE-Recht diese Funktion durch eine
-- gleichnamige Relation kapern. Jede Rollenprüfung im System hängt an
-- dieser einen Funktion (siehe M1 Task 11 im Ledger).
create function current_rolle() returns rolle_enum
language sql security definer stable
set search_path = public, pg_temp as $$
  select rolle from profiles where user_id = auth.uid()
$$;
revoke execute on function current_rolle() from anon;

-- profiles: jede/r sieht das eigene Profil, admin sieht alle
create policy "eigenes profil lesen" on profiles for select
  using (user_id = auth.uid() or current_rolle() = 'admin');
-- WITH CHECK ist hier keine Formalität: ohne sie erlaubt UPDATE jedem
-- eingeloggten Nutzer, die eigene rolle-Spalte beliebig zu setzen, da
-- USING allein nicht prüft, was geschrieben wird (siehe M1 Task 11 im
-- Ledger — als kritischer Fund erst nach dem Anwenden entdeckt).
create policy "eigenes profil aktualisieren" on profiles for update
  using (user_id = auth.uid() or current_rolle() = 'admin')
  with check (
    current_rolle() = 'admin'
    or rolle = (select p2.rolle from profiles p2 where p2.user_id = auth.uid())
  );
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

-- Nicht "eingeloggt liest", sondern nur admin/vermittler: die Basistabelle
-- muss die Vertraulichkeits-Einschränkung selbst tragen, sonst liest jede/r
-- leser sie direkt und umgeht die Maskierung von anfragen_sichtbar komplett
-- (siehe M1 Task 11 im Ledger — als kritischer Fund erst nach dem Anwenden
-- entdeckt, weil kein Einzel-Review Tabelle und View zusammen betrachtete).
create policy "vermittler liest anfragen" on anfragen for select
  to authenticated
  using (current_rolle() in ('admin', 'vermittler'));
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

-- Vertrauliche Anfragen: leser sieht weder firma_id noch budget_pro_m2.
-- security_invoker = false (Standard) ist hier bewusst richtig, nicht ein
-- Rückschritt: die Basistabelle anfragen erlaubt seit der Korrektur oben nur
-- noch admin/vermittler den direkten Zugriff, also braucht die View ihre
-- eigene Sichtbarkeits-Wache (WHERE auth.role() = 'authenticated'), um
-- leser überhaupt etwas zu zeigen — mit security_invoker=true würde die
-- View sonst durch die neue Basis-Policy für leser ebenfalls leer laufen.
-- security_barrier verhindert, dass der Planer WHERE-Bedingungen der
-- aufrufenden Query vor die Maskierung zieht. Die CASE-Bedingung ist
-- bewusst "fail closed" (maskiert ausser bei explizit admin/vermittler),
-- damit eine unbestimmte Rolle nie als sicher gilt. (Siehe M1 Task 11 im
-- Ledger: erst security_invoker=true als Fix für "View umgeht RLS", dann
-- diese Version als Fix für "Basistabelle selbst ungeschützt" — beide
-- Funde erst nach dem jeweiligen Anwenden entdeckt.)
create view anfragen_sichtbar
with (security_invoker = false, security_barrier = true)
as
select
  a.id,
  case when (not a.vertraulich) or current_rolle() in ('admin', 'vermittler')
    then a.firma_id else null end as firma_id,
  a.flaeche_min,
  a.flaeche_max,
  a.ort,
  case when (not a.vertraulich) or current_rolle() in ('admin', 'vermittler')
    then a.budget_pro_m2 else null end as budget_pro_m2,
  a.bezug,
  a.nutzung,
  a.anforderungen,
  a.status,
  a.vertraulich,
  a.letzter_kontakt,
  a.created_at
from anfragen a
where auth.role() = 'authenticated';

-- Wertebereiche, die das README vorgibt, aber die Spaltentypen allein nicht
-- erzwingen.
alter table matches add constraint matches_score_range check (score between 0 and 100);
alter table profiles add constraint profiles_freigabe_stufe_range check (freigabe_stufe between 1 and 3);
```

- [ ] **Step 2: Anwenden**

Run: `supabase db push`
Expected: keine Fehler.

- [ ] **Step 3: RLS manuell im SQL-Editor prüfen**

Im Supabase-Dashboard, SQL-Editor, als eingeloggter Test-Nutzer (via `set local role authenticated; set local request.jwt.claims = '{"sub": "<beliebige-uuid>"}';` oder einfacher: nach Task 24 mit einem echten Login testen) — vorläufig genügt: `select * from anfragen_sichtbar;` als `service_role` ausgeführt liefert alle Zeilen unverändert (da `current_rolle()` für `service_role` `null` liefert und die Bedingung `... = 'leser'` dann `false` ist).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations
git commit -m "feat: RLS-Policies und View anfragen_sichtbar anlegen"
```

---

### Task 12: Seed-Daten aus dem Prototyp

Die Werte stammen unverändert aus `docs/puls-cockpit-v5.html` (Objekte, Anfragen, Nachrichten, Regeln) — dieselben Solothurner Beispieldaten wie im Prototyp, wie das README verlangt.

**Files:**
- Create: `supabase/seed.sql`

**Interfaces:**
- Consumes: Schema aus Task 10/11.
- Produces: Testdaten für jede UI-Task ab M5.

- [ ] **Step 1: `supabase/seed.sql` anlegen**

```sql
insert into firmen (id, name, branche, kontakt_email) values
  ('11111111-1111-1111-1111-111111111101', 'Helvetia Dental Labor', 'Medizintechnik', 'kontakt@helvetia-dental.ch'),
  ('11111111-1111-1111-1111-111111111102', 'Meier Präzisionstechnik AG', 'Fertigung', 'kontakt@meier-praezision.ch'),
  ('11111111-1111-1111-1111-111111111103', 'Studio Bruggmann', 'Kreativ', 'n.bruggmann@studiobruggmann.ch'),
  ('11111111-1111-1111-1111-111111111104', 'Beat''s Musikbar GmbH', 'Gastro', 'kontakt@beats-musikbar.ch'),
  ('11111111-1111-1111-1111-111111111105', 'Frischwerk Getränke AG', 'Handel', 'kontakt@frischwerk.ch'),
  ('11111111-1111-1111-1111-111111111106', 'Lagerhaus Aare GmbH', 'Logistik', 'kontakt@lagerhaus-aare.ch'),
  ('11111111-1111-1111-1111-111111111107', 'Kaufmann Baunebengewerbe', 'Bau', 'm.kaufmann@kaufmann-bau.ch'),
  ('11111111-1111-1111-1111-111111111108', 'Nordwest Metallbau AG', 'Metallbau', 'r.hunziker@nordwest-metallbau.ch'),
  ('11111111-1111-1111-1111-111111111109', 'Thermo-Kunststoff GmbH', 'Kunststoff', 'b.frei@thermo-kunststoff.ch');

insert into objekte (id, titel, adresse, ort, flaeche, preis_pro_m2, nutzung, eigenschaften, verfuegbar_ab, eigentuemer, foto_url, status) values
  ('22222222-2222-2222-2222-222222222201', 'Büro Altstadt', 'Hauptgasse 12, 4500 Solothurn', 'Solothurn', 240, 245, 'buero', '{}', '2026-11-01', 'Bürgergemeinde', null, 'verfuegbar'),
  ('22222222-2222-2222-2222-222222222202', 'Gewerbehalle Zuchwil', 'Industriestrasse 10, 4528 Zuchwil', 'Zuchwil', 2400, 128, 'gewerbe', '{"kran_tonnen": 16}', '2026-10-01', 'Privat', null, 'verfuegbar'),
  ('22222222-2222-2222-2222-222222222203', 'Gewerbe Bettlach', 'Industriestrasse 4, 2544 Bettlach', 'Bettlach', 380, 158, 'gewerbe', '{}', '2026-09-01', 'Suter Immobilien AG', null, 'verfuegbar'),
  ('22222222-2222-2222-2222-222222222204', 'Logistik Derendingen', 'Gewerbestrasse 5, 4552 Derendingen', 'Derendingen', 2850, 121, 'lager', '{"rampe": true}', '2026-09-01', 'Aare Invest AG', null, 'verfuegbar'),
  ('22222222-2222-2222-2222-222222222205', 'Produktionshalle Biberist', 'Fabrikstrasse 2, 4562 Biberist', 'Biberist', 2300, 112, 'produktion', '{}', '2026-09-01', 'Privat', null, 'verfuegbar'),
  ('22222222-2222-2222-2222-222222222206', 'Bauland Luterbach', 'Arbeitszone, 4542 Luterbach', 'Luterbach', 6200, null, 'bauland', '{}', '2026-09-01', 'Gemeinde Luterbach', null, 'verfuegbar');

insert into anfragen (id, firma_id, flaeche_min, flaeche_max, ort, budget_pro_m2, bezug, nutzung, anforderungen, status, vertraulich, letzter_kontakt) values
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111101', 320, 450, 'Bettlach', 165, 'Q1 2027', 'produktion', '{}', 'offen', false, now() - interval '1 day'),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111102', 1800, 2600, 'Wasseramt', 130, 'Q2 2027', 'produktion', '{}', 'offen', false, now() - interval '3 days'),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111103', 180, 260, 'Solothurn', 250, 'Q4 2026', 'buero', '{}', 'offen', false, now() - interval '12 days'),
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111104', 200, 300, 'Solothurn', 210, 'Q1 2027', 'gewerbe', '{}', 'offen', false, now() - interval '15 days'),
  ('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111105', 1500, 2500, 'Solothurn', 110, 'Q1 2027', 'lager', '{}', 'offen', false, now() - interval '22 days'),
  ('33333333-3333-3333-3333-333333333306', '11111111-1111-1111-1111-111111111106', 2000, 3000, 'Solothurn', 118, 'sofort', 'lager', '{"rampe": true}', 'offen', true, now() - interval '41 days'),
  ('33333333-3333-3333-3333-333333333307', '11111111-1111-1111-1111-111111111107', 1900, 2400, 'Bucheggberg', null, null, 'gewerbe', '{}', 'offen', false, now() - interval '63 days'),
  ('33333333-3333-3333-3333-333333333308', '11111111-1111-1111-1111-111111111108', 2200, null, 'Zuchwil', 125, 'Q4 2026', 'produktion', '{"kran_tonnen": 16}', 'offen', false, now() - interval '96 days');

insert into regeln (code, beschreibung, angewendet_count, aktiv) values
  ('R-01', 'Laute Nutzungen nicht in die Altstadt', 3, true),
  ('R-02', 'Logistik nur mit Rampe', 11, true),
  ('R-03', 'Produktion über 1500 m² nur in Arbeitszone', 24, true),
  ('R-04', 'Budget bis ±12 % gilt als Treffer', 31, true),
  ('R-05', 'Gastro erst nach Bewilligungscheck', 5, true),
  ('R-06', 'Bezug «offen» nach 90 Tagen ruhend', 9, true);
```

Ein Beispiel für eine bereits erkannte Eingangs-Mail (`nachrichten`) wird bewusst nicht geseedet — das ist ab M5 der erste Fall, den die echte KI-Erkennung live durchläuft, nicht ein simulierter.

- [ ] **Step 2: Seed einspielen**

Run: `supabase db reset` (spielt Migrationen und Seed neu ein) oder, falls die Datenbank bereits Daten enthält: den Inhalt von `supabase/seed.sql` einmalig im SQL-Editor ausführen.
Expected: keine Fehler, Zeilen erscheinen im Table Editor.

- [ ] **Step 3: Stichprobe prüfen**

Run (Supabase SQL-Editor): `select count(*) from anfragen;`
Expected: `8`.

- [ ] **Step 4: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat: Solothurner Beispieldaten aus dem Prototyp seeden"
```

---

### Task 13: Generierte Typen einbinden

**Files:**
- Modify: `types/database.ts` (Platzhalter aus M0 Task 5 ersetzen)

**Interfaces:**
- Produces: `Database`-Typ, den `lib/supabase/client.ts` und `lib/supabase/server.ts` bereits erwarten (M0 Task 5).

- [ ] **Step 1: Typen generieren**

Run: `npm run types`
Expected: `types/database.ts` wird überschrieben mit den generierten Supabase-Typen (Tabellen, Enums, Views inklusive `anfragen_sichtbar`).
Unter Windows muss der `>`-Redirect in einer Shell laufen, die UTF-8 erzeugt (cmd.exe oder Git Bash) — PowerShells Standardencoding ist UTF-16LE und würde die Datei unbrauchbar machen.

- [ ] **Step 2: Build gegen die echten Typen prüfen**

Run: `npx tsc --noEmit`
Expected: keine Fehler (der bisherige Code verwendet `Database` nur generisch, keine spezifischen Feldzugriffe, die brechen könnten).

- [ ] **Step 3: Die aktualisierte Datei committen**

Anders als in der ersten Fassung dieses Plans ist `types/database.ts`
**nicht** `.gitignore`d (siehe M0 Task 9 im Ledger) — sie wird committet,
damit ein frischer Checkout baut, ohne selbst die Supabase-CLI aufzurufen.

```bash
git add types/database.ts
git commit -m "chore: generierte Supabase-Typen aktualisieren"
```

---

### Task 14: Meilenstein M1 abschliessen

- [ ] **Step 1: Abnahme gegen README-Kriterium prüfen**

Im Supabase SQL-Editor: `insert into anfragen (ort, nutzung) values ('Solothurn', 'buero');` — Expected: Erfolg, obwohl `flaeche_min`, `flaeche_max`, `budget_pro_m2`, `bezug` fehlen. Das bestätigt das Abnahmekriterium „Anfrage ohne Budget und Bezugstermin lässt sich speichern".

- [ ] **Step 2: Testzeile wieder entfernen**

Run: `delete from anfragen where ort = 'Solothurn' and firma_id is null;`

- [ ] **Step 3: Pull Request öffnen, CI abwarten, mergen**

```bash
git push -u origin feature/m1-schema
gh pr create --title "M1: Schema, RLS, Seed" --base main
gh pr merge --squash
git checkout main && git pull
```

---

## Meilenstein M2 · `lib/puls.ts`, `lib/matching.ts`, `lib/format.ts` — testgetrieben

Diese drei Dateien sind laut README die einzige Logik mit automatisierten Tests. Jede Task folgt strikt Rot-Grün-Commit.

### Task 15: `lib/format.ts`

**Files:**
- Modify: `lib/format.test.ts` (Platzhalter aus M0 Task 4 ersetzen)
- Create: `lib/format.ts`

**Interfaces:**
- Produces: `formatFlaeche(m2: number): string`, `formatPreis(chfM2: number): string`, `formatDatum(datum: Date): string` — verwendet von jeder Anzeige-Komponente ab M4.

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```ts
import { describe, expect, it } from "vitest"
import { formatDatum, formatFlaeche, formatPreis } from "./format"

describe("formatFlaeche", () => {
  it("formatiert mit Tausendertrennzeichen und Einheit", () => {
    expect(formatFlaeche(2400)).toBe("2'400 m²")
  })
  it("lässt kleine Zahlen unverändert", () => {
    expect(formatFlaeche(240)).toBe("240 m²")
  })
})

describe("formatPreis", () => {
  it("formatiert als Schweizer Franken pro Quadratmeter", () => {
    expect(formatPreis(245)).toBe("CHF 245/m²")
  })
  it("rundet auf ganze Franken", () => {
    expect(formatPreis(244.6)).toBe("CHF 245/m²")
  })
})

describe("formatDatum", () => {
  it("formatiert als Tag.Monat.Jahr", () => {
    expect(formatDatum(new Date("2026-08-25"))).toBe("25.08.2026")
  })
})
```

- [ ] **Step 2: Fehlschlag bestätigen**

Run: `npm run test`
Expected: FAIL — `./format` liefert keine Exporte.

- [ ] **Step 3: Implementieren**

Bewusst ohne `Intl`: `Intl.NumberFormat("de-CH")` liefert je nach ICU-Version des
ausführenden Systems einen typografischen Apostroph (`’`, U+2019) statt des
geraden Zeichens (`'`, U+0027) — das wäre zwischen der Windows-Entwicklungsumgebung
und den Ubuntu-CI-Runnern nicht garantiert gleich. Der Tausendertrenner wird
deshalb selbst gesetzt.

```ts
export function formatFlaeche(m2: number): string {
  const gerundet = Math.round(m2).toString()
  const mitApostroph = gerundet.replace(/\B(?=(\d{3})+(?!\d))/g, "'")
  return `${mitApostroph} m²`
}

export function formatPreis(chfProM2: number): string {
  return `CHF ${Math.round(chfProM2)}/m²`
}

export function formatDatum(datum: Date): string {
  // UTC-Getter statt lokaler Getter: `objekte.verfuegbar_ab` ist ein reines
  // Kalenderdatum ohne Uhrzeit. new Date("2026-08-25") liegt auf UTC-Mitternacht;
  // mit lokalen Gettern würde eine Zeitzone westlich von UTC auf den Vortag
  // zurückfallen. UTC-Getter sind unabhängig von der Zeitzone des Rechners.
  const tag = String(datum.getUTCDate()).padStart(2, "0")
  const monat = String(datum.getUTCMonth() + 1).padStart(2, "0")
  const jahr = datum.getUTCFullYear()
  return `${tag}.${monat}.${jahr}`
}
```

- [ ] **Step 4: Erfolg bestätigen**

Run: `npm run test`
Expected: alle Tests PASS.

- [ ] **Step 5: Commit**

```bash
git checkout -b feature/m2-logik
git add lib/format.ts lib/format.test.ts
git commit -m "feat: Formatierungsfunktionen für Fläche, Preis, Datum"
```

---

### Task 16: `lib/puls.ts`

Formel exakt aus dem README übernommen.

**Files:**
- Create: `lib/puls.test.ts`
- Create: `lib/puls.ts`

**Interfaces:**
- Produces: `puls(letzterKontakt: Date): number`, `pulsFarbe(wert: number): "gut" | "warn" | "kritisch"` — verwendet von `MatchCard`, `PulsHero`, `AnfrageDetail` ab M4/M6/M8.

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```ts
import { describe, expect, it } from "vitest"
import { puls, pulsFarbe } from "./puls"

function vorTagen(tage: number): Date {
  return new Date(Date.now() - tage * 86_400_000)
}

describe("puls", () => {
  it("liefert 100 bei Kontakt heute", () => {
    expect(puls(vorTagen(0))).toBe(100)
  })
  it("sinkt um 1 pro Tag", () => {
    expect(puls(vorTagen(10))).toBe(90)
  })
  it("hat eine Untergrenze von 4", () => {
    expect(puls(vorTagen(500))).toBe(4)
  })
})

describe("pulsFarbe", () => {
  it("ist gut ab 60", () => {
    expect(pulsFarbe(60)).toBe("gut")
    expect(pulsFarbe(100)).toBe("gut")
  })
  it("ist warn zwischen 25 und 59", () => {
    expect(pulsFarbe(25)).toBe("warn")
    expect(pulsFarbe(59)).toBe("warn")
  })
  it("ist kritisch unter 25", () => {
    expect(pulsFarbe(24)).toBe("kritisch")
    expect(pulsFarbe(4)).toBe("kritisch")
  })
})
```

- [ ] **Step 2: Fehlschlag bestätigen**

Run: `npm run test`
Expected: FAIL — `./puls` existiert nicht.

- [ ] **Step 3: Implementieren (wörtlich aus dem README)**

```ts
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

- [ ] **Step 4: Erfolg bestätigen**

Run: `npm run test`
Expected: alle Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/puls.ts lib/puls.test.ts
git commit -m "feat: puls() und pulsFarbe() gemäss README"
```

---

### Task 17: `lib/matching.ts` — Typen und Fläche (30 %)

`matching.ts` wird über mehrere Tasks aufgebaut (ein Kriterium nach dem anderen), damit jeder Schritt einzeln testbar bleibt. Erst Task 21 fügt alle Kriterien zu `berechneMatch` zusammen.

**Files:**
- Create: `types/index.ts`
- Create: `lib/matching.test.ts`
- Create: `lib/matching.ts`

**Interfaces:**
- Produces: `Anfrage`, `Objekt`, `Match`, `Kriterium` (Typen); `punkteFlaeche(anfrage, objekt): number` — interner Baustein von `berechneMatch` (Task 21).

- [ ] **Step 1: Abgeleitete Typen anlegen**

```ts
export type Nutzung = "buero" | "gewerbe" | "produktion" | "lager" | "verkauf" | "bauland"
export type KriteriumStatus = "ok" | "teilweise" | "nein"

export type Anfrage = {
  id: string
  flaecheMin: number | null
  flaecheMax: number | null
  ort: string | null
  budgetProM2: number | null
  bezug: string | null
  nutzung: Nutzung
  anforderungen: Record<string, boolean | number | string>
  letzterKontakt: Date
}

export type Objekt = {
  id: string
  titel: string
  ort: string
  flaeche: number
  preisProM2: number | null
  nutzung: Nutzung
  eigenschaften: Record<string, boolean | number | string>
  verfuegbarAb: Date
}

export type Kriterium = {
  kriterium: string
  gesucht: string
  angeboten: string
  status: KriteriumStatus
}

export type Match = {
  anfrageId: string
  objektId: string
  score: number
  kriterien: Kriterium[]
  hinweis: string
}
```

- [ ] **Step 2: Fehlschlagenden Test für die Fläche schreiben**

```ts
import { describe, expect, it } from "vitest"
import { punkteFlaeche } from "./matching"
import type { Anfrage, Objekt } from "@/types"

function anfrage(teil: Partial<Anfrage> = {}): Anfrage {
  return {
    id: "a1", flaecheMin: 180, flaecheMax: 260, ort: "Solothurn",
    budgetProM2: 250, bezug: "Q4 2026", nutzung: "buero",
    anforderungen: {}, letzterKontakt: new Date(), ...teil,
  }
}

function objekt(teil: Partial<Objekt> = {}): Objekt {
  return {
    id: "o1", titel: "Test", ort: "Solothurn", flaeche: 240,
    preisProM2: 245, nutzung: "buero", eigenschaften: {},
    verfuegbarAb: new Date(), ...teil,
  }
}

describe("punkteFlaeche", () => {
  it("gibt volle Punktzahl innerhalb der Spanne", () => {
    expect(punkteFlaeche(anfrage(), objekt({ flaeche: 240 }))).toBe(100)
  })
  it("nimmt linear ab oberhalb der Spanne", () => {
    const punkte = punkteFlaeche(anfrage({ flaecheMax: 260 }), objekt({ flaeche: 286 }))
    expect(punkte).toBeCloseTo(90, 0)
  })
  it("nimmt linear ab unterhalb der Spanne", () => {
    const punkte = punkteFlaeche(anfrage({ flaecheMin: 180 }), objekt({ flaeche: 162 }))
    expect(punkte).toBeCloseTo(90, 0)
  })
  it("behandelt eine offene Untergrenze (ab X m²) als erfüllt, wenn das Objekt grösser ist", () => {
    expect(punkteFlaeche(anfrage({ flaecheMin: 2200, flaecheMax: null }), objekt({ flaeche: 2400 }))).toBe(100)
  })
  it("liefert 50 wenn beide Grenzen fehlen", () => {
    expect(punkteFlaeche(anfrage({ flaecheMin: null, flaecheMax: null }), objekt({ flaeche: 500 }))).toBe(50)
  })
})
```

- [ ] **Step 3: Fehlschlag bestätigen**

Run: `npm run test`
Expected: FAIL — `punkteFlaeche` existiert nicht.

- [ ] **Step 4: Implementieren**

Lineare Abnahme: 10 Punkte Abzug pro 10 % Abweichung von der überschrittenen Grenze, auf 0 begrenzt. Ohne jede Grenze (weder Min noch Max) ist die Fläche unbekannt — das ist über `anforderungen`/fehlende Werte hinaus ein eigener Lückenfall und wird neutral mit 50 bewertet, statt fälschlich 100 zu suggerieren.

```ts
export function punkteFlaeche(anfrage: Anfrage, objekt: Objekt): number {
  const { flaecheMin, flaecheMax } = anfrage
  if (flaecheMin === null && flaecheMax === null) return 50

  const min = flaecheMin ?? 0
  const max = flaecheMax ?? Infinity
  if (objekt.flaeche >= min && objekt.flaeche <= max) return 100

  const referenz = objekt.flaeche < min ? min : max
  if (!Number.isFinite(referenz) || referenz === 0) return 100
  const abweichung = Math.abs(objekt.flaeche - referenz) / referenz
  return Math.max(0, Math.round(100 - abweichung * 100))
}
```

- [ ] **Step 5: Erfolg bestätigen**

Run: `npm run test`
Expected: alle Tests PASS.

- [ ] **Step 6: Commit**

```bash
git add types/index.ts lib/matching.ts lib/matching.test.ts
git commit -m "feat: matching.ts - Flächenkriterium (30%)"
```

---

### Task 18: `lib/matching.ts` — Preis (25 %)

**Files:**
- Modify: `lib/matching.test.ts`
- Modify: `lib/matching.ts`

**Interfaces:**
- Produces: `punktePreis(anfrage, objekt): number`.

- [ ] **Step 1: Fehlschlagende Tests hinzufügen**

```ts
import { punktePreis } from "./matching"

describe("punktePreis", () => {
  it("gibt volle Punktzahl bei exaktem Budget", () => {
    expect(punktePreis(anfrage({ budgetProM2: 250 }), objekt({ preisProM2: 250 }))).toBe(100)
  })
  it("gibt volle Punktzahl bei Unterschreitung", () => {
    expect(punktePreis(anfrage({ budgetProM2: 250 }), objekt({ preisProM2: 200 }))).toBe(100)
  })
  it("gibt noch volle Punktzahl bis 12% über Budget", () => {
    expect(punktePreis(anfrage({ budgetProM2: 200 }), objekt({ preisProM2: 224 }))).toBe(100)
  })
  it("nimmt danach steil ab", () => {
    const punkte = punktePreis(anfrage({ budgetProM2: 200 }), objekt({ preisProM2: 240 }))
    expect(punkte).toBeLessThan(100)
    expect(punkte).toBeGreaterThanOrEqual(0)
  })
  it("liefert 50 wenn kein Budget genannt ist", () => {
    expect(punktePreis(anfrage({ budgetProM2: null }), objekt({ preisProM2: 200 }))).toBe(50)
  })
  it("liefert 50 wenn das Objekt keinen Preis hat (auf Anfrage)", () => {
    expect(punktePreis(anfrage({ budgetProM2: 200 }), objekt({ preisProM2: null }))).toBe(50)
  })
})
```

- [ ] **Step 2: Fehlschlag bestätigen** — Run: `npm run test`, Expected: FAIL.

- [ ] **Step 3: Implementieren**

Toleranz bis 12 % über Budget, danach 2 Punkte Abzug pro Prozentpunkt darüber (kommentiert, weil das *Warum* — die 12 %-Toleranz — sonst nicht aus dem Code ersichtlich ist).

```ts
export function punktePreis(anfrage: Anfrage, objekt: Objekt): number {
  if (anfrage.budgetProM2 === null || objekt.preisProM2 === null) return 50
  if (objekt.preisProM2 <= anfrage.budgetProM2) return 100

  const ueberschreitung = (objekt.preisProM2 / anfrage.budgetProM2 - 1) * 100
  // Bis 12% über Budget gilt laut README noch als voller Treffer.
  if (ueberschreitung <= 12) return 100

  const ueberTolerierten = ueberschreitung - 12
  return Math.max(0, Math.round(100 - ueberTolerierten * 2))
}
```

- [ ] **Step 4: Erfolg bestätigen** — Run: `npm run test`, Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/matching.ts lib/matching.test.ts
git commit -m "feat: matching.ts - Preiskriterium mit 12%-Toleranz (25%)"
```

---

### Task 19: `lib/matching.ts` — Lage (20 %) und Bezug (15 %)

**Files:**
- Modify: `lib/matching.test.ts`
- Modify: `lib/matching.ts`

**Interfaces:**
- Produces: `punkteLage(anfrage, objekt): number`, `punkteBezug(anfrage, objekt): number`.

- [ ] **Step 1: Fehlschlagende Tests hinzufügen**

Lage: „Gleicher Ort voll, gleiche Region teilweise" — eine feste Regions-Zuordnung der Solothurner Gemeinden aus dem Prototyp bildet „Region" ab (z. B. „Wasseramt" als Region, die Zuchwil, Derendingen, Biberist, Luterbach umfasst).

```ts
import { punkteBezug, punkteLage } from "./matching"

describe("punkteLage", () => {
  it("gibt volle Punktzahl bei gleichem Ort", () => {
    expect(punkteLage(anfrage({ ort: "Solothurn" }), objekt({ ort: "Solothurn" }))).toBe(100)
  })
  it("gibt Teilpunkte bei gleicher Region", () => {
    expect(punkteLage(anfrage({ ort: "Wasseramt" }), objekt({ ort: "Zuchwil" }))).toBe(60)
  })
  it("gibt wenig Punkte bei unterschiedlicher Region", () => {
    expect(punkteLage(anfrage({ ort: "Solothurn" }), objekt({ ort: "Bettlach" }))).toBeLessThan(60)
  })
  it("liefert 50 wenn kein Ort genannt ist", () => {
    expect(punkteLage(anfrage({ ort: null }), objekt())).toBe(50)
  })
})

describe("punkteBezug", () => {
  it("gibt volle Punktzahl wenn beide 'sofort' sind", () => {
    expect(punkteBezug(anfrage({ bezug: "sofort" }), objekt({ verfuegbarAb: new Date() }))).toBe(100)
  })
  it("gibt Teilpunkte bei bis zu einem Monat Abweichung", () => {
    const inDreiWochen = new Date(Date.now() + 21 * 86_400_000)
    expect(punkteBezug(anfrage({ bezug: "sofort" }), objekt({ verfuegbarAb: inDreiWochen }))).toBe(60)
  })
  it("liefert 50 wenn kein Bezugstermin genannt ist", () => {
    expect(punkteBezug(anfrage({ bezug: null }), objekt({ verfuegbarAb: new Date() }))).toBe(50)
  })
})
```

- [ ] **Step 2: Fehlschlag bestätigen** — Run: `npm run test`, Expected: FAIL.

- [ ] **Step 3: Implementieren**

`bezug` ist Freitext (`"Q1 2027"`, `"sofort"`) — für den Zahlenvergleich mit `verfuegbarAb` (Datum) wird nur der Sonderfall `"sofort"` numerisch geprüft; jeder andere Text ergibt Teilpunkte, weil ein exakter Quartalsabgleich ohne strukturiertes Datumsformat in der Anfrage nicht zuverlässig möglich ist (Freitext-Einschränkung, siehe README-Spaltendefinition `bezug text`).

```ts
const REGIONEN: Record<string, string> = {
  Solothurn: "Solothurn", Bettlach: "Jura", Selzach: "Jura",
  Zuchwil: "Wasseramt", Derendingen: "Wasseramt", Biberist: "Wasseramt", Luterbach: "Wasseramt",
  Wasseramt: "Wasseramt",
}

export function punkteLage(anfrage: Anfrage, objekt: Objekt): number {
  if (anfrage.ort === null) return 50
  if (anfrage.ort === objekt.ort) return 100
  const regionAnfrage = REGIONEN[anfrage.ort] ?? anfrage.ort
  const regionObjekt = REGIONEN[objekt.ort] ?? objekt.ort
  if (regionAnfrage === regionObjekt) return 60
  return 20
}

export function punkteBezug(anfrage: Anfrage, objekt: Objekt): number {
  if (anfrage.bezug === null) return 50
  if (anfrage.bezug.toLowerCase() === "sofort") {
    const tage = (objekt.verfuegbarAb.getTime() - Date.now()) / 86_400_000
    if (tage <= 0) return 100
    if (tage <= 30) return 60
    return 20
  }
  return 60
}
```

- [ ] **Step 4: Erfolg bestätigen** — Run: `npm run test`, Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/matching.ts lib/matching.test.ts
git commit -m "feat: matching.ts - Lage- und Bezugskriterium (20% + 15%)"
```

---

### Task 20: `lib/matching.ts` — Anforderungen (10 %)

**Files:**
- Modify: `lib/matching.test.ts`
- Modify: `lib/matching.ts`

**Interfaces:**
- Produces: `punkteAnforderungen(anfrage, objekt): number`.

- [ ] **Step 1: Fehlschlagende Tests hinzufügen**

```ts
import { punkteAnforderungen } from "./matching"

describe("punkteAnforderungen", () => {
  it("liefert 100 wenn keine Anforderungen gestellt sind", () => {
    expect(punkteAnforderungen(anfrage({ anforderungen: {} }), objekt())).toBe(100)
  })
  it("liefert 100 wenn alle Anforderungen erfüllt sind", () => {
    const a = anfrage({ anforderungen: { rampe: true } })
    const o = objekt({ eigenschaften: { rampe: true } })
    expect(punkteAnforderungen(a, o)).toBe(100)
  })
  it("liefert den Anteil erfüllter Anforderungen", () => {
    const a = anfrage({ anforderungen: { rampe: true, kran_tonnen: 16 } })
    const o = objekt({ eigenschaften: { rampe: true, kran_tonnen: 10 } })
    expect(punkteAnforderungen(a, o)).toBe(50)
  })
  it("liefert 0 wenn nichts erfüllt ist", () => {
    const a = anfrage({ anforderungen: { rampe: true } })
    const o = objekt({ eigenschaften: {} })
    expect(punkteAnforderungen(a, o)).toBe(0)
  })
})
```

- [ ] **Step 2: Fehlschlag bestätigen** — Run: `npm run test`, Expected: FAIL.

- [ ] **Step 3: Implementieren**

Bei numerischen Anforderungen (`kran_tonnen: 16`) zählt „erfüllt", wenn der Objektwert mindestens so hoch ist; bei booleschen genügt exakte Übereinstimmung.

```ts
export function punkteAnforderungen(anfrage: Anfrage, objekt: Objekt): number {
  const eintraege = Object.entries(anfrage.anforderungen)
  if (eintraege.length === 0) return 100

  const erfuellt = eintraege.filter(([schluessel, wert]) => {
    const angebotswert = objekt.eigenschaften[schluessel]
    if (typeof wert === "number") return typeof angebotswert === "number" && angebotswert >= wert
    return angebotswert === wert
  }).length

  return Math.round((erfuellt / eintraege.length) * 100)
}
```

- [ ] **Step 4: Erfolg bestätigen** — Run: `npm run test`, Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/matching.ts lib/matching.test.ts
git commit -m "feat: matching.ts - Anforderungskriterium (10%)"
```

---

### Task 21: `berechneMatch` — Gewichtung, Kriterien-Tabelle, Hinweis, Ausschluss unter 60

Fügt die vier Einzelkriterien zu der einen Funktion zusammen, die README und Spec verlangen.

**Files:**
- Modify: `lib/matching.test.ts`
- Modify: `lib/matching.ts`

**Interfaces:**
- Consumes: `punkteFlaeche`, `punktePreis`, `punkteLage`, `punkteBezug`, `punkteAnforderungen` (Tasks 17–20).
- Produces: `berechneMatch(anfrage: Anfrage, objekt: Objekt): Match | null` — die einzige Funktion, die `app/actions/anfragen.ts` (M6) und `app/actions/objekte.ts` (M7) aufrufen.

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```ts
import { berechneMatch } from "./matching"

describe("berechneMatch", () => {
  it("liefert null unter Score 60", () => {
    const a = anfrage({ flaecheMin: 5000, flaecheMax: 6000, budgetProM2: 50 })
    const o = objekt({ flaeche: 100, preisProM2: 500 })
    expect(berechneMatch(a, o)).toBeNull()
  })

  it("berechnet den gewichteten Score bei vollem Treffer", () => {
    // bezug:"sofort" statt des Default-Freitexts "Q4 2026", damit auch das
    // Bezugskriterium bei sofortiger Verfügbarkeit volle 100 Punkte gibt.
    const a = anfrage({ bezug: "sofort" })
    const o = objekt({ verfuegbarAb: new Date() })
    const match = berechneMatch(a, o)
    expect(match).not.toBeNull()
    expect(match!.score).toBe(100)
  })

  it("gewichtet Fläche 30%, Preis 25%, Lage 20%, Bezug 15%, Anforderungen 10%", () => {
    // Nur die Fläche weicht ab (auf 0 Punkte), alles andere ist perfekt.
    const a = anfrage({ flaecheMin: 180, flaecheMax: 260, ort: "Solothurn", budgetProM2: 250, bezug: null })
    const o = objekt({ flaeche: 5000, ort: "Solothurn", preisProM2: 250 })
    const match = berechneMatch(a, o)
    // 0*0.30 + 100*0.25 + 100*0.20 + 50*0.15 (bezug=null->50) + 100*0.10 = 62.5 -> 63
    expect(match!.score).toBe(63)
  })

  it("füllt die Kriterien-Tabelle mit gesucht/angeboten/status je Zeile", () => {
    const match = berechneMatch(anfrage(), objekt())
    expect(match!.kriterien).toContainEqual(
      expect.objectContaining({ kriterium: "Fläche", status: "ok" })
    )
  })

  it("setzt den Hinweis auf den schwächsten Punkt", () => {
    const a = anfrage({ budgetProM2: 200 })
    const o = objekt({ preisProM2: 400, flaeche: 240, ort: "Solothurn" })
    const match = berechneMatch(a, o)
    expect(match!.hinweis.toLowerCase()).toContain("preis")
  })

  it("liefert null bei durchgehend schwachen Werten in allen Kriterien", () => {
    const a = anfrage({ flaecheMin: 9000, flaecheMax: 9500, budgetProM2: 10, ort: "Bettlach", bezug: "sofort" })
    const o = objekt({ flaeche: 100, preisProM2: 900, ort: "Zuchwil", verfuegbarAb: new Date(Date.now() + 200 * 86_400_000) })
    expect(berechneMatch(a, o)).toBeNull()
  })
})
```

- [ ] **Step 2: Fehlschlag bestätigen** — Run: `npm run test`, Expected: FAIL — `berechneMatch` existiert nicht.

- [ ] **Step 3: Implementieren**

Kommentar zum *Warum* der Gewichtungs-Konstante, weil sie sonst nur eine Zahlenreihe wäre.

```ts
// Gewichtung exakt aus dem README: Fläche 30%, Preis 25%, Lage 20%, Bezug 15%, Anforderungen 10%.
const GEWICHTE = { flaeche: 0.3, preis: 0.25, lage: 0.2, bezug: 0.15, anforderungen: 0.1 } as const

function kriteriumFlaeche(anfrage: Anfrage, objekt: Objekt, punkte: number): Kriterium {
  const gesucht =
    anfrage.flaecheMin !== null && anfrage.flaecheMax !== null
      ? `${anfrage.flaecheMin}–${anfrage.flaecheMax} m²`
      : anfrage.flaecheMin !== null
        ? `ab ${anfrage.flaecheMin} m²`
        : anfrage.flaecheMax !== null
          ? `bis ${anfrage.flaecheMax} m²`
          : "?"
  return {
    kriterium: "Fläche", gesucht, angeboten: `${objekt.flaeche} m²`,
    status: punkte >= 90 ? "ok" : punkte >= 50 ? "teilweise" : "nein",
  }
}

function kriteriumPreis(anfrage: Anfrage, objekt: Objekt, punkte: number): Kriterium {
  return {
    kriterium: "Preis",
    gesucht: anfrage.budgetProM2 !== null ? `bis CHF ${anfrage.budgetProM2}/m²` : "?",
    angeboten: objekt.preisProM2 !== null ? `CHF ${objekt.preisProM2}/m²` : "auf Anfrage",
    status: punkte >= 90 ? "ok" : punkte >= 50 ? "teilweise" : "nein",
  }
}

function kriteriumLage(anfrage: Anfrage, objekt: Objekt, punkte: number): Kriterium {
  return {
    kriterium: "Lage", gesucht: anfrage.ort ?? "?", angeboten: objekt.ort,
    status: punkte >= 90 ? "ok" : punkte >= 50 ? "teilweise" : "nein",
  }
}

function kriteriumBezug(anfrage: Anfrage, objekt: Objekt, punkte: number): Kriterium {
  return {
    kriterium: "Bezug",
    gesucht: anfrage.bezug ?? "?",
    angeboten: objekt.verfuegbarAb.toISOString().slice(0, 10),
    status: punkte >= 90 ? "ok" : punkte >= 50 ? "teilweise" : "nein",
  }
}

function kriteriumAnforderungen(anfrage: Anfrage, punkte: number): Kriterium {
  const anzahl = Object.keys(anfrage.anforderungen).length
  return {
    kriterium: "Anforderungen",
    gesucht: anzahl > 0 ? `${anzahl} Anforderung(en)` : "keine",
    angeboten: `${punkte}% erfüllt`,
    status: punkte >= 90 ? "ok" : punkte >= 50 ? "teilweise" : "nein",
  }
}

export function berechneMatch(anfrage: Anfrage, objekt: Objekt): Match | null {
  const pFlaeche = punkteFlaeche(anfrage, objekt)
  const pPreis = punktePreis(anfrage, objekt)
  const pLage = punkteLage(anfrage, objekt)
  const pBezug = punkteBezug(anfrage, objekt)
  const pAnforderungen = punkteAnforderungen(anfrage, objekt)

  const score = Math.round(
    pFlaeche * GEWICHTE.flaeche +
      pPreis * GEWICHTE.preis +
      pLage * GEWICHTE.lage +
      pBezug * GEWICHTE.bezug +
      pAnforderungen * GEWICHTE.anforderungen
  )

  if (score < 60) return null

  const kriterien = [
    kriteriumFlaeche(anfrage, objekt, pFlaeche),
    kriteriumPreis(anfrage, objekt, pPreis),
    kriteriumLage(anfrage, objekt, pLage),
    kriteriumBezug(anfrage, objekt, pBezug),
    kriteriumAnforderungen(anfrage, pAnforderungen),
  ]

  const schwaechstes = kriterien.reduce((a, b) => {
    const punkteA = { ok: 3, teilweise: 2, nein: 1 }[a.status]
    const punkteB = { ok: 3, teilweise: 2, nein: 1 }[b.status]
    return punkteB < punkteA ? b : a
  })

  const hinweisText: Record<string, string> = {
    Fläche: "Fläche weicht von der gesuchten Spanne ab.",
    Preis: "Preis liegt spürbar über dem genannten Budget.",
    Lage: "Lage entspricht nicht der gewünschten Region.",
    Bezug: "Bezugstermin weicht deutlich vom Wunsch ab.",
    Anforderungen: "Nicht alle Zusatzanforderungen sind erfüllt.",
  }

  return {
    anfrageId: anfrage.id,
    objektId: objekt.id,
    score,
    kriterien,
    hinweis: schwaechstes.status === "ok" ? "Alle Kriterien passen gut." : hinweisText[schwaechstes.kriterium],
  }
}
```

- [ ] **Step 4: Erfolg bestätigen**

Run: `npm run test`
Expected: alle Tests in `lib/matching.test.ts` und `lib/puls.test.ts` und `lib/format.test.ts` PASS.

- [ ] **Step 5: Vollständigen Testlauf und Typecheck bestätigen**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: alle drei ohne Fehler.

- [ ] **Step 6: Commit**

```bash
git add lib/matching.ts lib/matching.test.ts
git commit -m "feat: berechneMatch - Gewichtung, Kriterien, Hinweis, Ausschluss unter 60"
```

---

### Task 22: Meilenstein M2 abschliessen

- [ ] **Step 1: Abnahmekriterien aus README/Spec gegenprüfen**

`lib/matching.ts` und `lib/puls.ts` sind vollständig durch Tests abgedeckt (README-Abnahmekriterium). Kein `any` in beiden Dateien (`grep -n "any" lib/matching.ts lib/puls.ts` liefert nichts). Beide Dateien bleiben unter 200 Zeilen (`wc -l lib/matching.ts lib/puls.ts`).

- [ ] **Step 2: Pull Request öffnen, CI abwarten, mergen**

```bash
git push -u origin feature/m2-logik
gh pr create --title "M2: puls.ts und matching.ts, testgetrieben" --base main
gh pr merge --squash
git checkout main && git pull
```

---

## Meilenstein M3 · Auth, geschützte Routen, Rollen

Kein öffentliches Sign-up — ein kleines Team, Nutzer werden von einer Administratorin angelegt (README: drei Rollen in `profiles.rolle`).

### Task 23: Profil automatisch bei Registrierung anlegen

**Files:**
- Create: `supabase/migrations/<timestamp>_profil_trigger.sql`

**Interfaces:**
- Produces: eine `profiles`-Zeile für jeden neuen `auth.users`-Eintrag, Standardrolle `leser`, Standard-Freigabestufe `1`.

- [ ] **Step 1: Migration anlegen**

Run: `supabase migration new profil_trigger`

```sql
create function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (user_id, name, rolle, freigabe_stufe)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'leser',
    1
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

- [ ] **Step 2: Anwenden**

Run: `supabase db push`
Expected: keine Fehler.

- [ ] **Step 3: Commit**

```bash
git checkout -b feature/m3-auth
git add supabase/migrations
git commit -m "feat: Profil-Trigger bei Registrierung"
```

---

### Task 24: `lib/queries/profile.ts` und Typ `Profil`

**Files:**
- Modify: `types/index.ts`
- Create: `lib/queries/profile.ts`

**Interfaces:**
- Consumes: `erstelleServerClient` (M0 Task 5), generierter `Database`-Typ (M1 Task 13).
- Produces: `holeEigenesProfil(): Promise<Profil>` — verwendet vom Layout (M4), von `app/actions/*.ts` zur Freigabestufen-Prüfung, und von jeder Query, die `leser` gegenüber `admin`/`vermittler` unterscheiden muss.

- [ ] **Step 1: `Profil`-Typ ergänzen**

Der generierte Datenbanktyp wird direkt wiederverwendet, keine Dopplung der Feldnamen (README: „Typen aus dem Supabase-Schema generieren und verwenden").

```ts
import type { Database } from "./database"

export type Profil = Database["public"]["Tables"]["profiles"]["Row"]
```

- [ ] **Step 2: `lib/queries/profile.ts` anlegen**

```ts
import { erstelleServerClient } from "@/lib/supabase/server"
import type { Profil } from "@/types"

export async function holeEigenesProfil(): Promise<Profil> {
  const supabase = await erstelleServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Nicht angemeldet")

  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).single()
  if (error) throw error
  return data
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler (Funktion wird erst ab M4 tatsächlich aufgerufen).

- [ ] **Step 4: Commit**

```bash
git add types/index.ts lib/queries/profile.ts
git commit -m "feat: holeEigenesProfil-Query"
```

---

### Task 25: Middleware für Session-Aktualisierung und geschützte Routen

**Files:**
- Create: `middleware.ts`

**Interfaces:**
- Produces: Umleitung auf `/login` für jede nicht angemeldete Anfrage ausserhalb von `/login`; hält die Supabase-Session-Cookies aktuell.

- [ ] **Step 1: `middleware.ts` im Projekt-Root anlegen**

```ts
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const istLoginSeite = request.nextUrl.pathname.startsWith("/login")
  if (!user && !istLoginSeite) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  if (user && istLoginSeite) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

- [ ] **Step 2: Manuell prüfen, dass die Umleitung greift**

Run: `npm run dev`, im Browser `http://localhost:3000` ohne vorherige Anmeldung öffnen.
Expected: Weiterleitung auf `/login` (die Seite existiert erst nach Task 26 — bis dahin liefert das eine 404, was die Umleitung selbst bereits bestätigt; nach Task 26 erscheint das echte Formular).

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: Middleware für Session-Refresh und geschützte Routen"
```

---

### Task 26: Anmeldeseite

**Files:**
- Create: `app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `erstelleBrowserClient` (M0 Task 5).
- Produces: den einzigen öffentlich erreichbaren Pfad der Anwendung.

- [ ] **Step 1: `app/(auth)/login/page.tsx` anlegen**

Formular braucht echte Interaktivität (Eingabe, Fehleranzeige, Ladezustand) — `"use client"` gerechtfertigt.

```tsx
"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { erstelleBrowserClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [passwort, setPasswort] = useState("")
  const [fehler, setFehler] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(false)

  async function anmelden(ereignis: FormEvent) {
    ereignis.preventDefault()
    setLaedt(true)
    setFehler(null)
    const supabase = erstelleBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: passwort })
    setLaedt(false)
    if (error) {
      setFehler("E-Mail oder Passwort stimmt nicht.")
      return
    }
    router.push("/")
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <form
        onSubmit={anmelden}
        className="flex w-full max-w-sm flex-col gap-3 rounded-card border border-line bg-surface p-6"
      >
        <h1 className="font-display text-xl font-bold text-ink">PULS</h1>
        <input
          type="email"
          required
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-line-2 px-3 py-2 text-sm text-ink"
        />
        <input
          type="password"
          required
          placeholder="Passwort"
          value={passwort}
          onChange={(e) => setPasswort(e.target.value)}
          className="rounded-lg border border-line-2 px-3 py-2 text-sm text-ink"
        />
        {fehler && <p className="text-sm text-crit">{fehler}</p>}
        <button
          type="submit"
          disabled={laedt}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-on-brand disabled:opacity-60"
        >
          {laedt ? "…" : "Anmelden"}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(auth)/login/page.tsx"
git commit -m "feat: Anmeldeseite"
```

---

### Task 27: Server Action für die Freigabestufe

**Files:**
- Create: `app/actions/profile.ts`

**Interfaces:**
- Consumes: `holeEigenesProfil` (Task 24).
- Produces: `setzeFreigabeStufe(stufe: 1 | 2 | 3): Promise<void>` — verwendet vom `FreigabeSchalter` (M4).

- [ ] **Step 1: `app/actions/profile.ts` anlegen**

```ts
"use server"

import { revalidatePath } from "next/cache"
import { erstelleServerClient } from "@/lib/supabase/server"
import { holeEigenesProfil } from "@/lib/queries/profile"

export async function setzeFreigabeStufe(stufe: 1 | 2 | 3): Promise<void> {
  const profil = await holeEigenesProfil()
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("profiles").update({ freigabe_stufe: stufe }).eq("id", profil.id)
  if (error) throw error
  revalidatePath("/", "layout")
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 3: Commit**

```bash
git add app/actions/profile.ts
git commit -m "feat: setzeFreigabeStufe Server Action"
```

---

### Task 28: Ersten Admin-Nutzer anlegen und Anmeldung end-to-end prüfen

Kein Code-Task — Einrichtung von Hand, weil es der erste Nutzer überhaupt ist.

- [ ] **Step 1: Nutzer im Supabase-Dashboard anlegen**

*Authentication → Users → Add user*, E-Mail und Passwort selbst wählen, „Auto Confirm User" aktivieren.

- [ ] **Step 2: Rolle auf `admin` setzen**

Im SQL-Editor: `update profiles set rolle = 'admin', name = 'A. Zellweger' where user_id = '<user-id aus Schritt 1>';`

- [ ] **Step 3: End-to-end anmelden**

Run: `npm run dev`, im Browser mit den Zugangsdaten aus Schritt 1 anmelden.
Expected: Weiterleitung auf `/` (aktuell noch die Platzhalterseite aus M0); erneutes Öffnen von `/login` bei bestehender Session leitet zurück auf `/` (Middleware-Regel aus Task 25).

---

### Task 29: Meilenstein M3 abschliessen

- [ ] **Step 1: Abnahme prüfen**

Nicht angemeldet auf `/postfach` zugreifen (Pfad existiert erst ab M5, aber die Middleware greift bereits generisch) — Expected: Weiterleitung auf `/login`.

- [ ] **Step 2: Pull Request öffnen, CI abwarten, mergen**

```bash
git push -u origin feature/m3-auth
gh pr create --title "M3: Auth, geschützte Routen, Rollen" --base main
gh pr merge --squash
git checkout main && git pull
```

---

## Meilenstein M4 · Design-Tokens, Seitenleiste, Kopfzeile, Drawer, Dunkelmodus

Jede Komponente übersetzt die entsprechende Prototyp-Ansicht (`docs/puls-cockpit-v5.html`) 1:1 in Tailwind-Utilities, die die in M0/Task 2 eingebundenen Tokens verwenden — keine neu erfundene Optik.

### Task 30: UI-Grundbausteine

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Chip.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/Feld.tsx`

**Interfaces:**
- Produces: `Button`, `Chip`, `Card`, `Feld` — von praktisch jeder Komponente ab M4 verwendet.

- [ ] **Step 1: `components/ui/Button.tsx`**

```tsx
import type { ButtonHTMLAttributes } from "react"

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primaer" | "sekundaer" }

export function Button({ variante = "sekundaer", className = "", ...rest }: Props) {
  const basis = "rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60"
  const stil =
    variante === "primaer"
      ? "bg-brand text-on-brand hover:bg-brand-2"
      : "border border-line-2 bg-surface text-ink hover:bg-surface-2"
  return <button className={`${basis} ${stil} ${className}`} {...rest} />
}
```

- [ ] **Step 2: `components/ui/Chip.tsx`**

```tsx
type Props = { kind?: "neutral" | "gut" | "warn" | "kritisch"; children: React.ReactNode }

const STILE: Record<NonNullable<Props["kind"]>, string> = {
  neutral: "bg-surface-3 text-ink-2",
  gut: "bg-good-bg text-good",
  warn: "bg-warn-bg text-warn",
  kritisch: "bg-crit-bg text-crit",
}

export function Chip({ kind = "neutral", children }: Props) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STILE[kind]}`}>
      {children}
    </span>
  )
}
```

- [ ] **Step 3: `components/ui/Card.tsx`**

```tsx
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-card border border-line bg-surface ${className}`}>{children}</div>
}
```

- [ ] **Step 4: `components/ui/Feld.tsx`**

Zentrale Umsetzung der wichtigsten Textregel des Projekts: ein fehlender Wert erscheint als **?**, nicht als Erklärsatz.

```tsx
type Props = { label: string; wert: string | null }

export function Feld({ label, wert }: Props) {
  const fehlt = wert === null || wert === ""
  return (
    <div className={`rounded-lg border px-3 py-2 ${fehlt ? "border-warn bg-warn-bg" : "border-line"}`}>
      <div className="text-xs text-ink-3">{label}</div>
      <div className={`mt-0.5 text-sm font-medium ${fehlt ? "font-display text-lg text-warn" : "text-ink"}`}>
        {fehlt ? "?" : wert}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Typecheck und Commit**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

```bash
git checkout -b feature/m4-layout
git add components/ui
git commit -m "feat: UI-Grundbausteine Button, Chip, Card, Feld"
```

---

### Task 31: Seitenleiste und Freigabe-Schalter

**Files:**
- Create: `components/layout/Sidebar.tsx`
- Create: `components/layout/FreigabeSchalter.tsx`

**Interfaces:**
- Consumes: `Profil` (M3 Task 24), `setzeFreigabeStufe` (M3 Task 27).
- Produces: `<Sidebar profil={profil} />`, verwendet vom `(app)`-Layout (Task 34).

- [ ] **Step 1: `components/layout/FreigabeSchalter.tsx`**

Segmentierter Schalter mit echter Interaktivität → `"use client"`.

```tsx
"use client"

import { useState, useTransition } from "react"
import { setzeFreigabeStufe } from "@/app/actions/profile"

const TEXTE: Record<1 | 2 | 3, string> = {
  1: "Stufe 1 · alles bestätigen",
  2: "Stufe 2 · Nachfragen automatisch",
  3: "Stufe 3 · voll autonom",
}

export function FreigabeSchalter({ aktuelleStufe }: { aktuelleStufe: 1 | 2 | 3 }) {
  const [stufe, setStufe] = useState<1 | 2 | 3>(aktuelleStufe)
  const [istPending, startTransition] = useTransition()

  function waehlen(neu: 1 | 2 | 3) {
    setStufe(neu)
    startTransition(() => {
      setzeFreigabeStufe(neu)
    })
  }

  return (
    <div className="m-2.5 rounded-card border border-line bg-surface-2 p-3">
      <span className="mb-1.5 block text-xs text-ink-3">Freigabe</span>
      <div className="flex gap-0.5 rounded-lg border border-line bg-surface p-0.5">
        {([1, 2, 3] as const).map((option) => (
          <button
            key={option}
            onClick={() => waehlen(option)}
            disabled={istPending}
            className={`flex-1 rounded-md py-1 text-xs font-semibold ${
              stufe === option ? "bg-brand text-on-brand" : "text-ink-3"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-ink-2">{TEXTE[stufe]}</p>
    </div>
  )
}
```

- [ ] **Step 2: `components/layout/Sidebar.tsx`**

Aktive Seite hervorheben braucht `usePathname()` → die ganze Seitenleiste ist client-seitig.

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { Profil } from "@/types"
import { FreigabeSchalter } from "./FreigabeSchalter"

const EINTRAEGE = [
  { pfad: "/", label: "Matches", icon: "◈" },
  { pfad: "/postfach", label: "Postfach", icon: "✉" },
  { pfad: "/anfragen", label: "Anfragen", icon: "↘" },
  { pfad: "/objekte", label: "Objekte", icon: "▤" },
  { pfad: "/regeln", label: "Regeln", icon: "§" },
  { pfad: "/zahlen", label: "Zahlen", icon: "▁" },
]

export function Sidebar({ profil }: { profil: Profil }) {
  const pfad = usePathname()
  const initialen = profil.name
    .split(" ")
    .map((teil) => teil[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <aside className="flex h-screen w-[206px] flex-none flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-2 px-4 pb-3.5 pt-4">
        <span className="font-display text-lg font-bold text-ink">PULS</span>
      </div>
      <span className="border-b border-line px-4 pb-3.5 text-xs text-ink-3">espaceSOLOTHURN</span>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2.5">
        {EINTRAEGE.map((eintrag) => {
          const aktiv = pfad === eintrag.pfad
          return (
            <Link
              key={eintrag.pfad}
              href={eintrag.pfad}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${
                aktiv ? "bg-brand-soft font-semibold text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <span className="w-4 text-center text-xs opacity-80">{eintrag.icon}</span>
              {eintrag.label}
            </Link>
          )
        })}
      </nav>

      <FreigabeSchalter aktuelleStufe={profil.freigabe_stufe as 1 | 2 | 3} />

      <div className="flex items-center gap-2.5 border-t border-line px-4 py-3 text-xs text-ink-2">
        <span className="grid h-[27px] w-[27px] place-items-center rounded-full bg-brand text-[11px] font-semibold text-on-brand">
          {initialen}
        </span>
        {profil.name}
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Typecheck und Commit**

Run: `npx tsc --noEmit`

```bash
git add components/layout/Sidebar.tsx components/layout/FreigabeSchalter.tsx
git commit -m "feat: Seitenleiste mit Navigation und Freigabe-Schalter"
```

---

### Task 32: Kopfzeile mit Dunkelmodus

**Files:**
- Create: `components/layout/Header.tsx`

**Interfaces:**
- Produces: `<Header titel untertitel />`, von jeder Seite (M6–M10) am Anfang ihres Inhalts gerendert.

- [ ] **Step 1: `components/layout/Header.tsx`**

Umschalten und Zustand halten braucht Interaktivität → `"use client"`.

```tsx
"use client"

import { useEffect, useState } from "react"

export function Header({ titel, untertitel }: { titel: string; untertitel: string }) {
  const [dunkel, setDunkel] = useState(false)

  useEffect(() => {
    const gespeichert = localStorage.getItem("puls-theme")
    if (gespeichert === "dark") {
      setDunkel(true)
      document.documentElement.setAttribute("data-theme", "dark")
    }
  }, [])

  function umschalten() {
    const neu = !dunkel
    setDunkel(neu)
    document.documentElement.setAttribute("data-theme", neu ? "dark" : "light")
    localStorage.setItem("puls-theme", neu ? "dark" : "light")
  }

  return (
    <header className="flex h-14 flex-none items-center gap-3 border-b border-line bg-surface px-5">
      <h1 className="font-display text-lg font-bold text-ink">{titel}</h1>
      <span className="text-xs text-ink-3">{untertitel}</span>
      <span className="flex-1" />
      <button
        onClick={umschalten}
        aria-label="Hell oder Dunkel"
        className="rounded-lg border border-line-2 px-2 py-1 text-xs text-ink-2 hover:bg-surface-2"
      >
        {dunkel ? "☾" : "☀"}
      </button>
    </header>
  )
}
```

- [ ] **Step 2: Typecheck und Commit**

```bash
git add components/layout/Header.tsx
git commit -m "feat: Kopfzeile mit Dunkelmodus-Umschalter"
```

---

### Task 33: Drawer (generische Seitenleiste rechts)

**Files:**
- Create: `components/layout/Drawer.tsx`

**Interfaces:**
- Produces: `<Drawer offen titel untertitel onSchliessen>{children}</Drawer>` — verwendet von `MatchDetail` (M8) und `AnfrageDetail` (M6).

- [ ] **Step 1: `components/layout/Drawer.tsx`**

```tsx
"use client"

import { useEffect } from "react"

type Props = {
  offen: boolean
  titel: string
  untertitel: string
  onSchliessen: () => void
  children: React.ReactNode
}

export function Drawer({ offen, titel, untertitel, onSchliessen, children }: Props) {
  useEffect(() => {
    function beiEscape(ereignis: KeyboardEvent) {
      if (ereignis.key === "Escape") onSchliessen()
    }
    document.addEventListener("keydown", beiEscape)
    return () => document.removeEventListener("keydown", beiEscape)
  }, [onSchliessen])

  return (
    <>
      <div
        onClick={onSchliessen}
        className={`fixed inset-0 z-40 bg-navy/40 transition-opacity ${
          offen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-hidden={!offen}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[440px] flex-col border-l border-line bg-surface shadow-2xl transition-transform ${
          offen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start gap-2.5 border-b border-line p-4">
          <div>
            <div className="font-display text-base font-bold text-ink">{titel}</div>
            <div className="mt-0.5 text-xs text-ink-3">{untertitel}</div>
          </div>
          <button onClick={onSchliessen} aria-label="Schliessen" className="ml-auto px-1 text-lg text-ink-3">
            ×
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-10">{children}</div>
      </aside>
    </>
  )
}
```

- [ ] **Step 2: Typecheck und Commit**

```bash
git add components/layout/Drawer.tsx
git commit -m "feat: generischer Drawer"
```

---

### Task 34: `(app)`-Layout verdrahten

**Files:**
- Create: `app/(app)/layout.tsx`
- Move: `app/page.tsx` → `app/(app)/page.tsx`

**Interfaces:**
- Consumes: `holeEigenesProfil` (M3 Task 24), `Sidebar` (Task 31).
- Produces: das Seitengerüst, in dem jede Seite ab M6 lebt.

- [ ] **Step 1: Platzhalter-Seite in die Routengruppe verschieben**

Ohne diesen Schritt kollidieren `app/page.tsx` und ein künftiges `app/(app)/page.tsx` auf derselben Route `/`.

```bash
mkdir -p "app/(app)"
git mv app/page.tsx "app/(app)/page.tsx"
```

- [ ] **Step 2: `app/(app)/layout.tsx` anlegen**

```tsx
import type { ReactNode } from "react"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { Sidebar } from "@/components/layout/Sidebar"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profil = await holeEigenesProfil()

  return (
    <div className="grid h-screen grid-cols-[206px_minmax(0,1fr)]">
      <Sidebar profil={profil} />
      <div className="flex min-h-0 flex-col">{children}</div>
    </div>
  )
}
```

- [ ] **Step 3: Platzhalterseite an das neue Muster anpassen**

Jede echte Seite rendert `Header` selbst und umschliesst ihren Inhalt mit einem scrollbaren Container — hier schon als Muster für M6–M10.

```tsx
import { Header } from "@/components/layout/Header"

export default function Home() {
  return (
    <>
      <Header titel="Matches" untertitel="" />
      <main className="flex-1 overflow-y-auto p-5">PULS</main>
    </>
  )
}
```

- [ ] **Step 4: Manuell im Browser prüfen**

Run: `npm run dev`, angemeldet auf `/` öffnen.
Expected: Seitenleiste links mit sechs Navigationspunkten, „Matches" aktiv hervorgehoben, Kopfzeile mit Titel „Matches" und Dunkelmodus-Knopf, Freigabe-Schalter zeigt „Stufe 1 · alles bestätigen".

- [ ] **Step 5: Dunkelmodus manuell prüfen**

Auf den Dunkelmodus-Knopf klicken.
Expected: Hintergrund wechselt zu `#161A33`, Seite neu laden — Einstellung bleibt erhalten (localStorage).

- [ ] **Step 6: Commit**

```bash
git add "app/(app)"
git commit -m "feat: (app)-Layout mit Seitenleiste verdrahten"
```

---

### Task 35: Meilenstein M4 abschliessen

- [ ] **Step 1: Alle Seiten der Navigation anklicken**

Jeder der sechs Menüpunkte führt zu einer 404, ausser „Matches" — das ist erwartet, die Seiten entstehen ab M5/M6/M7/M8/M9/M10.

- [ ] **Step 2: Pull Request öffnen, CI abwarten, mergen**

```bash
git push -u origin feature/m4-layout
gh pr create --title "M4: Layout, Design-Tokens, Dunkelmodus" --base main
gh pr merge --squash
git checkout main && git pull
```

---

## Meilenstein M5 · Postfach und KI-Mailerkennung

Das Herzstück der KI-Integration (Spec D5–D10). Reihenfolge: erst die Datenzugriffe, dann die KI-Bausteine mit ihren Tests, dann die Server Action, die alles verbindet, zuletzt die Oberfläche.

### Task 36: Query-Funktionen für `nachrichten` und `regeln`, erste Anfragen-Query

**Files:**
- Create: `lib/queries/nachrichten.ts`
- Create: `lib/queries/regeln.ts`
- Create: `lib/queries/anfragen.ts`

**Interfaces:**
- Produces: `holeNachrichten()`, `holeNachricht(id)`, `legeNachrichtAn(...)`, `aktualisiereNachricht(id, aenderung)`, `loescheNachricht(id)`, `zaehleNachrichten()`, `legeRegelAn(code, beschreibung)`, `naechsterRegelCode()`, `legeAnfrageAn(...)` — verwendet von `app/actions/nachrichten.ts` (Task 39) und der Seitenleiste (Task 45).

- [ ] **Step 1: `lib/queries/nachrichten.ts` anlegen**

```ts
import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

export type NachrichtRow = Database["public"]["Tables"]["nachrichten"]["Row"]
type NachrichtEinfuegen = Database["public"]["Tables"]["nachrichten"]["Insert"]

export async function holeNachrichten(): Promise<NachrichtRow[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("nachrichten").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function holeNachricht(id: string): Promise<NachrichtRow | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("nachrichten").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data
}

export async function legeNachrichtAn(nachricht: NachrichtEinfuegen): Promise<NachrichtRow> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("nachrichten").insert(nachricht).select().single()
  if (error) throw error
  return data
}

export async function aktualisiereNachricht(id: string, aenderung: Partial<NachrichtRow>): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("nachrichten").update(aenderung).eq("id", id)
  if (error) throw error
}

export async function loescheNachricht(id: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("nachrichten").delete().eq("id", id)
  if (error) throw error
}

export async function zaehleNachrichten(): Promise<number> {
  const supabase = await erstelleServerClient()
  const { count, error } = await supabase.from("nachrichten").select("*", { count: "exact", head: true })
  if (error) throw error
  return count ?? 0
}
```

- [ ] **Step 2: `lib/queries/regeln.ts` anlegen**

```ts
import { erstelleServerClient } from "@/lib/supabase/server"

export async function legeRegelAn(code: string, beschreibung: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("regeln").insert({ code, beschreibung })
  if (error) throw error
}

export async function naechsterRegelCode(): Promise<string> {
  const supabase = await erstelleServerClient()
  const { count, error } = await supabase.from("regeln").select("*", { count: "exact", head: true })
  if (error) throw error
  return `R-${String((count ?? 0) + 1).padStart(2, "0")}`
}
```

- [ ] **Step 3: `lib/queries/anfragen.ts` mit der ersten Funktion anlegen**

Weitere Funktionen (`holeAnfragen`, `holeAnfrage`, `aktualisiereAnfrage`) kommen in M6 dazu — diese Datei wird dort erweitert, nicht dupliziert.

```ts
import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type AnfrageEinfuegen = Database["public"]["Tables"]["anfragen"]["Insert"]
type AnfrageRow = Database["public"]["Tables"]["anfragen"]["Row"]

export async function legeAnfrageAn(anfrage: AnfrageEinfuegen): Promise<AnfrageRow> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").insert(anfrage).select().single()
  if (error) throw error
  return data
}
```

- [ ] **Step 4: Typecheck und Commit**

Run: `npx tsc --noEmit`

```bash
git checkout -b feature/m5-postfach-ki
git add lib/queries
git commit -m "feat: Query-Funktionen für Nachrichten, Regeln, erste Anfragen-Query"
```

---

### Task 37: `lib/ki/erkennung.ts` — Mailtext in Felder zerlegen

Acht Felder statt der sieben aus dem Prototyp: `nutzung` kommt dazu, weil `anfragen.nutzung` in der Datenbank nicht nullbar ist (README-Enum) und ohne KI-Schätzung sonst ein stiller Rateschritt in der Server Action nötig wäre.

**Files:**
- Create: `lib/ki/erkennung.test.ts`
- Create: `lib/ki/erkennung.ts`

**Interfaces:**
- Produces: `ErkannteFelder` (Typ), `baueErkennungsPrompt(text): string`, `parseErkennungsAntwort(antwort): ErkannteFelder`, `erkenneFelder(text): Promise<ErkannteFelder>` — verwendet von `app/actions/nachrichten.ts` (Task 39).

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```ts
import { describe, expect, it } from "vitest"
import { baueErkennungsPrompt, parseErkennungsAntwort } from "./erkennung"

describe("baueErkennungsPrompt", () => {
  it("enthält den übergebenen Mailtext", () => {
    const prompt = baueErkennungsPrompt("Wir suchen 500 m² in Solothurn.")
    expect(prompt).toContain("Wir suchen 500 m² in Solothurn.")
  })
})

describe("parseErkennungsAntwort", () => {
  it("parst ein vollständiges JSON-Objekt", () => {
    const antwort =
      '{"firma":"Muster AG","flaeche_min":500,"flaeche_max":800,"ort":"Solothurn","budget_pro_m2":200,"bezug":"Q1 2027","branche":"Handel","nutzung":"lager"}'
    expect(parseErkennungsAntwort(antwort)).toEqual({
      firma: "Muster AG", flaeche_min: 500, flaeche_max: 800, ort: "Solothurn",
      budget_pro_m2: 200, bezug: "Q1 2027", branche: "Handel", nutzung: "lager",
    })
  })

  it("entfernt Markdown-Codezäune um das JSON", () => {
    const antwort =
      '```json\n{"firma":"Muster AG","flaeche_min":null,"flaeche_max":null,"ort":null,"budget_pro_m2":null,"bezug":null,"branche":null,"nutzung":null}\n```'
    expect(parseErkennungsAntwort(antwort).firma).toBe("Muster AG")
  })

  it("setzt fehlende Felder auf null statt sie wegzulassen", () => {
    const antwort = '{"firma":"Muster AG"}'
    const ergebnis = parseErkennungsAntwort(antwort)
    expect(ergebnis.ort).toBeNull()
    expect(ergebnis.budget_pro_m2).toBeNull()
    expect(ergebnis.nutzung).toBeNull()
  })

  it("verwirft einen Wert mit falschem Typ statt ihn zu übernehmen", () => {
    expect(parseErkennungsAntwort('{"flaeche_min":"fünfhundert"}').flaeche_min).toBeNull()
  })

  it("verwirft eine nutzung ausserhalb des erlaubten Enums", () => {
    expect(parseErkennungsAntwort('{"nutzung":"garage"}').nutzung).toBeNull()
  })
})
```

- [ ] **Step 2: Fehlschlag bestätigen** — Run: `npm run test`, Expected: FAIL, `./erkennung` existiert nicht.

- [ ] **Step 3: Implementieren**

```ts
import { GoogleGenAI } from "@google/genai"
import type { Nutzung } from "@/types"

export type ErkannteFelder = {
  firma: string | null
  flaeche_min: number | null
  flaeche_max: number | null
  ort: string | null
  budget_pro_m2: number | null
  bezug: string | null
  branche: string | null
  nutzung: Nutzung | null
}

const NUTZUNGEN: Nutzung[] = ["buero", "gewerbe", "produktion", "lager", "verkauf", "bauland"]

function alsString(wert: unknown): string | null {
  return typeof wert === "string" && wert.length > 0 ? wert : null
}

function alsZahl(wert: unknown): number | null {
  return typeof wert === "number" && Number.isFinite(wert) ? wert : null
}

function alsNutzung(wert: unknown): Nutzung | null {
  return typeof wert === "string" && (NUTZUNGEN as string[]).includes(wert) ? (wert as Nutzung) : null
}

export function baueErkennungsPrompt(text: string): string {
  return `Lies die folgende E-Mail einer Firma, die eine Gewerbefläche in der Region Solothurn sucht, und extrahiere die genannten Werte.

E-Mail:
"""
${text}
"""

Antworte ausschliesslich mit einem JSON-Objekt in genau diesem Format, ohne weitere Erklärung:
{"firma": string|null, "flaeche_min": number|null, "flaeche_max": number|null, "ort": string|null, "budget_pro_m2": number|null, "bezug": string|null, "branche": string|null, "nutzung": "buero"|"gewerbe"|"produktion"|"lager"|"verkauf"|"bauland"|null}

Werte, die im Text nicht vorkommen, werden null. Zahlen ohne Tausendertrennzeichen. "bezug" bleibt der Originaltext des Zeitpunkts (z.B. "Q1 2027", "sofort"). "nutzung" ist genau einer der sieben genannten Werte oder null, wenn unklar.`
}

export function parseErkennungsAntwort(antwort: string): ErkannteFelder {
  const bereinigt = antwort.trim().replace(/^```(json)?\s*/i, "").replace(/```\s*$/, "")
  const daten = JSON.parse(bereinigt) as Record<string, unknown>
  return {
    firma: alsString(daten.firma),
    flaeche_min: alsZahl(daten.flaeche_min),
    flaeche_max: alsZahl(daten.flaeche_max),
    ort: alsString(daten.ort),
    budget_pro_m2: alsZahl(daten.budget_pro_m2),
    bezug: alsString(daten.bezug),
    branche: alsString(daten.branche),
    nutzung: alsNutzung(daten.nutzung),
  }
}

export async function erkenneFelder(text: string): Promise<ErkannteFelder> {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  // Modellname bei Umsetzung gegen die aktuell im kostenlosen Kontingent
  // verfügbaren Flash-Modelle prüfen (ai.google.dev/gemini-api/docs/models) —
  // "gemini-2.5-flash" ist der Stand zum Zeitpunkt dieses Plans.
  const antwort = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: baueErkennungsPrompt(text),
  })
  if (!antwort.text) throw new Error("Unerwartete Antwort der KI")
  return parseErkennungsAntwort(antwort.text)
}
```

- [ ] **Step 4: Erfolg bestätigen** — Run: `npm run test`, Expected: alle Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ki/erkennung.ts lib/ki/erkennung.test.ts
git commit -m "feat: KI-Mailerkennung - erkenneFelder mit testbarem Prompt-Bau und Parsing"
```

---

### Task 38: `lib/ki/entwuerfe.ts` — Rückfrage, Angebot, Nachfass formulieren

**Files:**
- Create: `lib/ki/entwuerfe.test.ts`
- Create: `lib/ki/entwuerfe.ts`

**Interfaces:**
- Consumes: `ErkannteFelder` (Task 37), `Anfrage`, `Objekt`, `Kriterium` (M2 Task 17).
- Produces: `Mailentwurf` (Typ), `entwurfRueckfrage(felder)`, `entwurfAngebot(anfrage, objekt, kriterien, hinweis)`, `entwurfNachfass(anfrage, tageSeitKontakt)` — verwendet von `app/actions/nachrichten.ts` (Task 39) und `app/actions/matches.ts` (M8).

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```ts
import { describe, expect, it } from "vitest"
import { baueRueckfragePrompt, baueAngebotPrompt, baueNachfassPrompt, parseMailAntwort } from "./entwuerfe"
import type { ErkannteFelder } from "./erkennung"
import type { Anfrage, Objekt } from "@/types"

describe("parseMailAntwort", () => {
  it("parst betreff und body", () => {
    expect(parseMailAntwort('{"betreff":"Rückfrage","body":"Guten Tag..."}')).toEqual({
      betreff: "Rückfrage", body: "Guten Tag...",
    })
  })
  it("entfernt Markdown-Codezäune", () => {
    expect(parseMailAntwort('```json\n{"betreff":"X","body":"Y"}\n```')).toEqual({ betreff: "X", body: "Y" })
  })
})

describe("baueRueckfragePrompt", () => {
  it("nennt nur die fehlenden Felder", () => {
    const felder: ErkannteFelder = {
      firma: "Muster AG", flaeche_min: 500, flaeche_max: 800, ort: "Solothurn",
      budget_pro_m2: null, bezug: null, branche: null, nutzung: "lager",
    }
    const prompt = baueRueckfragePrompt(felder)
    expect(prompt).toContain("budget_pro_m2")
    expect(prompt).toContain("bezug")
    expect(prompt).not.toContain("flaeche_min")
  })
})

describe("baueAngebotPrompt", () => {
  it("enthält Objekttitel und Hinweis", () => {
    const anfrage: Anfrage = {
      id: "a1", flaecheMin: 180, flaecheMax: 260, ort: "Solothurn", budgetProM2: 250,
      bezug: "Q4 2026", nutzung: "buero", anforderungen: {}, letzterKontakt: new Date(),
    }
    const objekt: Objekt = {
      id: "o1", titel: "Büro Altstadt", ort: "Solothurn", flaeche: 240, preisProM2: 245,
      nutzung: "buero", eigenschaften: {}, verfuegbarAb: new Date(),
    }
    const prompt = baueAngebotPrompt(anfrage, objekt, [], "Bezug liegt einen Monat später.")
    expect(prompt).toContain("Büro Altstadt")
    expect(prompt).toContain("Bezug liegt einen Monat später.")
  })
})

describe("baueNachfassPrompt", () => {
  it("nennt die Anzahl Tage und den Ort", () => {
    const anfrage: Anfrage = {
      id: "a1", flaecheMin: null, flaecheMax: null, ort: "Zuchwil", budgetProM2: null,
      bezug: null, nutzung: "gewerbe", anforderungen: {}, letzterKontakt: new Date(),
    }
    const prompt = baueNachfassPrompt(anfrage, 96)
    expect(prompt).toContain("96 Tagen")
    expect(prompt).toContain("Zuchwil")
  })
})
```

- [ ] **Step 2: Fehlschlag bestätigen** — Run: `npm run test`, Expected: FAIL, `./entwuerfe` existiert nicht.

- [ ] **Step 3: Implementieren**

```ts
import { GoogleGenAI } from "@google/genai"
import type { Anfrage, Kriterium, Objekt } from "@/types"
import type { ErkannteFelder } from "./erkennung"

export type Mailentwurf = { betreff: string; body: string }

const AUSGABEFORMAT =
  'Antworte ausschliesslich mit einem JSON-Objekt in genau diesem Format, ohne weitere Erklärung: {"betreff": string, "body": string}. Der Ton ist knapp, sachlich, per Sie, ohne Floskeln. Unterschrift: "Freundliche Grüsse\\nespaceSOLOTHURN".'

export function parseMailAntwort(antwort: string): Mailentwurf {
  const bereinigt = antwort.trim().replace(/^```(json)?\s*/i, "").replace(/```\s*$/, "")
  const daten = JSON.parse(bereinigt) as Record<string, unknown>
  return {
    betreff: typeof daten.betreff === "string" ? daten.betreff : "Ihre Anfrage bei espaceSOLOTHURN",
    body: typeof daten.body === "string" ? daten.body : "",
  }
}

async function frageKi(prompt: string): Promise<Mailentwurf> {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const antwort = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  })
  if (!antwort.text) throw new Error("Unerwartete Antwort der KI")
  return parseMailAntwort(antwort.text)
}

export function baueRueckfragePrompt(felder: ErkannteFelder): string {
  const fehlend = (Object.entries(felder) as [string, unknown][])
    .filter(([, wert]) => wert === null)
    .map(([schluessel]) => schluessel)
  return `Eine Firma hat eine Anfrage nach einer Gewerbefläche geschickt. Folgende Angaben fehlen noch: ${fehlend.join(", ")}.

Schreibe eine kurze Rückfrage-Mail, die genau nach diesen fehlenden Angaben fragt. ${AUSGABEFORMAT}`
}

export function entwurfRueckfrage(felder: ErkannteFelder): Promise<Mailentwurf> {
  return frageKi(baueRueckfragePrompt(felder))
}

export function baueAngebotPrompt(anfrage: Anfrage, objekt: Objekt, kriterien: Kriterium[], hinweis: string): string {
  const kriterienText = kriterien
    .map((k) => `- ${k.kriterium}: gesucht ${k.gesucht}, Objekt ${k.angeboten} (${k.status})`)
    .join("\n")
  return `Eine Firma sucht eine Gewerbefläche. Folgendes Objekt passt:

Objekt: ${objekt.titel}, ${objekt.flaeche} m², ${objekt.preisProM2 !== null ? `CHF ${objekt.preisProM2}/m²` : "Preis auf Anfrage"}
Vergleich:
${kriterienText}
Wichtigster Hinweis: ${hinweis}

Schreibe eine kurze Angebots-Mail an die Firma, die das Objekt vorstellt und zu einer Besichtigung einlädt. ${AUSGABEFORMAT}`
}

export function entwurfAngebot(
  anfrage: Anfrage,
  objekt: Objekt,
  kriterien: Kriterium[],
  hinweis: string
): Promise<Mailentwurf> {
  return frageKi(baueAngebotPrompt(anfrage, objekt, kriterien, hinweis))
}

export function baueNachfassPrompt(anfrage: Anfrage, tageSeitKontakt: number): string {
  return `Eine Firma sucht seit ${tageSeitKontakt} Tagen eine Gewerbefläche in ${anfrage.ort ?? "unbekanntem Ort"}, es gab seither keinen Kontakt mehr.

Schreibe eine kurze Nachfass-Mail, die freundlich fragt, ob die Suche noch aktuell ist. ${AUSGABEFORMAT}`
}

export function entwurfNachfass(anfrage: Anfrage, tageSeitKontakt: number): Promise<Mailentwurf> {
  return frageKi(baueNachfassPrompt(anfrage, tageSeitKontakt))
}
```

- [ ] **Step 4: Erfolg bestätigen** — Run: `npm run test`, Expected: alle Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ki/entwuerfe.ts lib/ki/entwuerfe.test.ts
git commit -m "feat: KI-Entwuerfe - Rückfrage, Angebot, Nachfass"
```

---

### Task 39: Server Action `nachrichtEingegangen` und Postfach-Aktionen

Implementiert Spec D7 (ein einziger Einstiegspunkt, quellenunabhängig) und D10 (Freigabestufen serverseitig).

**Files:**
- Create: `app/actions/nachrichten.ts`

**Interfaces:**
- Consumes: `erkenneFelder` (Task 37), `entwurfRueckfrage` (Task 38), `holeNachricht`/`legeNachrichtAn`/`aktualisiereNachricht` (Task 36), `legeAnfrageAn` (Task 36), `legeRegelAn`/`naechsterRegelCode` (Task 36), `holeEigenesProfil` (M3 Task 24).
- Produces: `nachrichtEingegangen(text, von, betreff)`, `alsAnfrageSpeichern(nachrichtId)`, `entwurfSenden(nachrichtId)`, `entwurfBearbeiten(nachrichtId, body)`, `entwurfVerwerfen(nachrichtId, grund)` — verwendet von `PostfachAnsicht` (Task 44) und später von `app/actions/matches.ts` (M8, für `sendeWennFreigegeben`).

`richtung` ist laut README-Enum (`eingang | entwurf | gesendet`) der **Status** einer Nachricht, nicht ihre feste Art — ein Entwurf wechselt bei echtem Versand zu `gesendet`, zusammen mit dem Zeitstempel `gesendet_am`. Eine erledigte Eingangs-Mail (gespeichert oder verworfen) wurde dagegen nie *von uns gesendet*; sie als `gesendet` umzuflaggen würde den Wert für jede spätere Auswertung (z. B. eine Versand-Erfolgsquote in M10) verfälschen. Erledigte Eingangs-Mails werden deshalb gelöscht, genau wie im Prototyp, der sie nach der Aktion aus seiner Liste entfernt.

- [ ] **Step 1: `app/actions/nachrichten.ts` anlegen**

```ts
"use server"

import { revalidatePath } from "next/cache"
import { erkenneFelder, type ErkannteFelder } from "@/lib/ki/erkennung"
import { entwurfRueckfrage } from "@/lib/ki/entwuerfe"
import {
  holeNachricht,
  legeNachrichtAn,
  aktualisiereNachricht,
  loescheNachricht,
  type NachrichtRow,
} from "@/lib/queries/nachrichten"
import { legeAnfrageAn } from "@/lib/queries/anfragen"
import { legeRegelAn, naechsterRegelCode } from "@/lib/queries/regeln"
import { holeEigenesProfil } from "@/lib/queries/profile"

// Rückfragen und Nachfass gelten laut README-Freigabestufen wie Rückfragen:
// automatischer Versand ab Stufe 2. Nur Angebote brauchen Stufe 3 (Spec-Annahme A2).
export async function sendeWennFreigegeben(nachricht: NachrichtRow, erforderlicheStufe: 2 | 3): Promise<void> {
  const profil = await holeEigenesProfil()
  if (profil.freigabe_stufe >= erforderlicheStufe) {
    await aktualisiereNachricht(nachricht.id, { richtung: "gesendet", gesendet_am: new Date().toISOString() })
  }
}

export async function nachrichtEingegangen(text: string, von: string, betreff: string): Promise<void> {
  const felder = await erkenneFelder(text)

  await legeNachrichtAn({
    richtung: "eingang",
    typ: "anfrage",
    von,
    an: "kontakt@espaceso.ch",
    betreff,
    body: text,
    erkannte_felder: felder,
  })

  const luecken = Object.values(felder).some((wert) => wert === null)
  if (luecken) {
    const entwurf = await entwurfRueckfrage(felder)
    const nachricht = await legeNachrichtAn({
      richtung: "entwurf",
      typ: "rueckfrage",
      von: "kontakt@espaceso.ch",
      an: von,
      betreff: entwurf.betreff,
      body: entwurf.body,
    })
    await sendeWennFreigegeben(nachricht, 2)
  }

  revalidatePath("/postfach")
}

export async function alsAnfrageSpeichern(nachrichtId: string): Promise<void> {
  const nachricht = await holeNachricht(nachrichtId)
  if (!nachricht) throw new Error("Nachricht nicht gefunden")

  const felder = nachricht.erkannte_felder as ErkannteFelder | null
  if (!felder) throw new Error("Diese Nachricht hat keine erkannten Felder")

  await legeAnfrageAn({
    ort: felder.ort,
    // Generischster Wert als Rückfallebene: anfragen.nutzung ist nicht nullbar,
    // die KI liefert aber nicht immer eine eindeutige Kategorie.
    nutzung: felder.nutzung ?? "gewerbe",
    flaeche_min: felder.flaeche_min,
    flaeche_max: felder.flaeche_max,
    budget_pro_m2: felder.budget_pro_m2,
    bezug: felder.bezug,
  })

  await loescheNachricht(nachrichtId)
  revalidatePath("/postfach")
  revalidatePath("/anfragen")
}

export async function entwurfSenden(nachrichtId: string): Promise<void> {
  await aktualisiereNachricht(nachrichtId, { richtung: "gesendet", gesendet_am: new Date().toISOString() })
  revalidatePath("/postfach")
}

export async function entwurfBearbeiten(nachrichtId: string, body: string): Promise<void> {
  await aktualisiereNachricht(nachrichtId, { body })
  revalidatePath("/postfach")
}

export async function entwurfVerwerfen(nachrichtId: string, grund: string): Promise<void> {
  const code = await naechsterRegelCode()
  await legeRegelAn(code, grund)
  await loescheNachricht(nachrichtId)
  revalidatePath("/postfach")
  revalidatePath("/regeln")
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 3: Commit**

```bash
git add app/actions/nachrichten.ts
git commit -m "feat: nachrichtEingegangen und Postfach-Aktionen mit Freigabestufen-Pruefung"
```

---

### Task 40: `MailEinfuegen` — Rohtext einfügen

**Files:**
- Create: `components/postfach/MailEinfuegen.tsx`

**Interfaces:**
- Consumes: `nachrichtEingegangen` (Task 39).
- Produces: den in Spec D7 beschriebenen Einfügen-Dialog.

- [ ] **Step 1: `components/postfach/MailEinfuegen.tsx` anlegen**

```tsx
import { useState } from "react"
import { nachrichtEingegangen } from "@/app/actions/nachrichten"
import { Button } from "@/components/ui/Button"

export function MailEinfuegen() {
  const [offen, setOffen] = useState(false)
  const [von, setVon] = useState("")
  const [betreff, setBetreff] = useState("")
  const [text, setText] = useState("")
  const [laedt, setLaedt] = useState(false)

  async function absenden() {
    setLaedt(true)
    await nachrichtEingegangen(text, von, betreff)
    setLaedt(false)
    setOffen(false)
    setVon("")
    setBetreff("")
    setText("")
  }

  if (!offen) {
    return (
      <Button variante="primaer" onClick={() => setOffen(true)} className="w-full">
        Neue Mail einfügen
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface-2 p-3">
      <input
        placeholder="Absender-E-Mail"
        value={von}
        onChange={(e) => setVon(e.target.value)}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 text-sm text-ink"
      />
      <input
        placeholder="Betreff"
        value={betreff}
        onChange={(e) => setBetreff(e.target.value)}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 text-sm text-ink"
      />
      <textarea
        placeholder="Mailtext einfügen…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 text-sm text-ink"
      />
      <div className="flex gap-2">
        <Button variante="primaer" onClick={absenden} disabled={laedt || !von || !text}>
          {laedt ? "KI liest…" : "Übernehmen"}
        </Button>
        <Button onClick={() => setOffen(false)}>Abbrechen</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck und Commit**

```bash
git add components/postfach/MailEinfuegen.tsx
git commit -m "feat: MailEinfuegen-Dialog fuer Mail-Rohtext"
```

---

### Task 41: `NachrichtenListe`

**Files:**
- Create: `components/postfach/NachrichtenListe.tsx`

**Interfaces:**
- Produces: `<NachrichtenListe nachrichten filter ausgewaehlteId onFilterWechsel onAuswahl />`.

- [ ] **Step 1: `components/postfach/NachrichtenListe.tsx` anlegen**

```tsx
import type { NachrichtRow } from "@/lib/queries/nachrichten"

export type PostfachFilter = "alle" | "eingang" | "entwurf"

type Props = {
  nachrichten: NachrichtRow[]
  filter: PostfachFilter
  ausgewaehlteId: string | null
  onFilterWechsel: (filter: PostfachFilter) => void
  onAuswahl: (id: string) => void
}

export function NachrichtenListe({ nachrichten, filter, ausgewaehlteId, onFilterWechsel, onAuswahl }: Props) {
  const gefiltert = nachrichten.filter((n) => {
    if (filter === "alle") return true
    if (filter === "eingang") return n.richtung === "eingang"
    return n.richtung === "entwurf"
  })

  return (
    <div className="rounded-card border border-line bg-surface">
      <div className="flex gap-1.5 border-b border-line p-2.5">
        {(["alle", "eingang", "entwurf"] as const).map((option) => (
          <button
            key={option}
            onClick={() => onFilterWechsel(option)}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              filter === option ? "border-navy bg-navy text-white" : "border-line text-ink-2"
            }`}
          >
            {option === "alle" ? "Alle" : option === "eingang" ? "Eingang" : "Entwürfe"}
          </button>
        ))}
      </div>
      {gefiltert.length === 0 && <p className="p-6 text-center text-sm text-ink-3">Nichts hier.</p>}
      {gefiltert.map((nachricht) => (
        <button
          key={nachricht.id}
          onClick={() => onAuswahl(nachricht.id)}
          className={`flex w-full gap-2.5 border-b border-line p-3 text-left last:border-b-0 hover:bg-surface-2 ${
            nachricht.id === ausgewaehlteId ? "bg-brand-soft" : ""
          }`}
        >
          <span
            className={`grid h-[26px] w-[26px] flex-none place-items-center rounded-lg text-sm ${
              nachricht.richtung === "eingang" ? "bg-surface-3 text-ink-2" : "bg-brand text-on-brand"
            }`}
          >
            {nachricht.richtung === "eingang" ? "↓" : "↑"}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-ink">{nachricht.betreff}</span>
            <span className="truncate text-xs text-ink-3">{nachricht.von}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck und Commit**

```bash
git add components/postfach/NachrichtenListe.tsx
git commit -m "feat: NachrichtenListe mit Filter"
```

---

### Task 42: `EingangDetail`

**Files:**
- Create: `components/postfach/EingangDetail.tsx`

**Interfaces:**
- Consumes: `Feld` (M4 Task 30), `ErkannteFelder` (Task 37).
- Produces: `<EingangDetail nachricht onSpeichern onRueckfrageOeffnen />`.

- [ ] **Step 1: `components/postfach/EingangDetail.tsx` anlegen**

```tsx
import { Feld } from "@/components/ui/Feld"
import { Button } from "@/components/ui/Button"
import type { NachrichtRow } from "@/lib/queries/nachrichten"
import type { ErkannteFelder } from "@/lib/ki/erkennung"

const LABELS: Record<keyof ErkannteFelder, string> = {
  firma: "Firma",
  flaeche_min: "Fläche ab",
  flaeche_max: "Fläche bis",
  ort: "Ort",
  budget_pro_m2: "Budget",
  bezug: "Bezug",
  branche: "Branche",
  nutzung: "Nutzung",
}

type Props = {
  nachricht: NachrichtRow
  onSpeichern: () => void
  onRueckfrageOeffnen: () => void
}

export function EingangDetail({ nachricht, onSpeichern, onRueckfrageOeffnen }: Props) {
  const felder = nachricht.erkannte_felder as ErkannteFelder | null
  const luecken = felder ? Object.values(felder).filter((wert) => wert === null).length : 0

  return (
    <div>
      <div className="border-b border-line p-4">
        <div className="font-display text-base font-bold text-ink">{nachricht.betreff}</div>
        <div className="mt-0.5 text-xs text-ink-3">
          {nachricht.von} · <a href={`mailto:${nachricht.von}`} className="text-brand hover:underline">{nachricht.von}</a>
        </div>
      </div>
      <div className="p-4">
        <div className="whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
          {nachricht.body}
        </div>
        {felder && (
          <>
            <div className="mb-2.5 mt-4 border-b border-line pb-1.5 text-xs text-ink-3">
              PULS hat erkannt{luecken > 0 ? ` · ${luecken} fehlt` : ""}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(LABELS) as (keyof ErkannteFelder)[]).map((schluessel) => (
                <Feld
                  key={schluessel}
                  label={LABELS[schluessel]}
                  wert={felder[schluessel] === null ? null : String(felder[schluessel])}
                />
              ))}
            </div>
          </>
        )}
        <div className="mt-3.5 flex flex-wrap gap-2">
          <Button variante="primaer" onClick={onSpeichern}>
            Als Anfrage speichern
          </Button>
          {luecken > 0 && <Button onClick={onRueckfrageOeffnen}>Rückfrage öffnen</Button>}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck und Commit**

```bash
git add components/postfach/EingangDetail.tsx
git commit -m "feat: EingangDetail mit erkannten Feldern"
```

---

### Task 43: `EntwurfDetail`

**Files:**
- Create: `components/postfach/EntwurfDetail.tsx`

**Interfaces:**
- Consumes: `entwurfSenden`, `entwurfBearbeiten`, `entwurfVerwerfen` (Task 39).
- Produces: `<EntwurfDetail nachricht />`.

- [ ] **Step 1: `components/postfach/EntwurfDetail.tsx` anlegen**

```tsx
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { entwurfSenden, entwurfBearbeiten, entwurfVerwerfen } from "@/app/actions/nachrichten"
import type { NachrichtRow } from "@/lib/queries/nachrichten"

const GRUENDE = ["Passt nicht zur Lage", "Preis unrealistisch", "Zu früh", "Anderer Grund"]

export function EntwurfDetail({ nachricht }: { nachricht: NachrichtRow }) {
  const [bearbeiten, setBearbeiten] = useState(false)
  const [body, setBody] = useState(nachricht.body)
  const [verwerfenOffen, setVerwerfenOffen] = useState(false)

  const versendet = nachricht.gesendet_am !== null

  return (
    <div>
      <div className="border-b border-line p-4">
        <div className="font-display text-base font-bold text-ink">{nachricht.betreff}</div>
        <div className="mt-0.5 text-xs text-ink-3">
          {versendet ? "Gesendet" : "Entwurf von PULS · noch nicht gesendet"}
        </div>
      </div>
      <div className="p-4">
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="flex gap-2.5 border-b border-line px-3 py-2 text-xs">
            <span className="w-12 flex-none text-ink-3">An</span>
            <span className="text-ink-2">{nachricht.an}</span>
          </div>
          <div className="flex gap-2.5 border-b border-line px-3 py-2 text-xs">
            <span className="w-12 flex-none text-ink-3">Betreff</span>
            <span className="text-ink-2">{nachricht.betreff}</span>
          </div>
          {bearbeiten ? (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full p-3 text-sm text-ink"
            />
          ) : (
            <div className="whitespace-pre-wrap p-3 text-sm text-ink-2">{nachricht.body}</div>
          )}
        </div>

        {!versendet && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            <Button variante="primaer" onClick={() => entwurfSenden(nachricht.id)}>
              Senden
            </Button>
            {bearbeiten ? (
              <Button
                onClick={() => {
                  void entwurfBearbeiten(nachricht.id, body)
                  setBearbeiten(false)
                }}
              >
                Übernehmen
              </Button>
            ) : (
              <Button onClick={() => setBearbeiten(true)}>Bearbeiten</Button>
            )}
            <Button onClick={() => setVerwerfenOffen((v) => !v)}>Verwerfen</Button>
          </div>
        )}

        {verwerfenOffen && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-dashed border-line-2 pt-3">
            {GRUENDE.map((grund) => (
              <button
                key={grund}
                onClick={() => entwurfVerwerfen(nachricht.id, grund)}
                className="rounded-full border border-line-2 px-2.5 py-1 text-xs text-ink-2 hover:border-brand hover:text-brand"
              >
                {grund}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck und Commit**

```bash
git add components/postfach/EntwurfDetail.tsx
git commit -m "feat: EntwurfDetail mit Bearbeiten, Senden, Verwerfen"
```

---

### Task 44: Postfach-Seite zusammensetzen

**Files:**
- Create: `components/postfach/PostfachAnsicht.tsx`
- Create: `app/(app)/postfach/page.tsx`

**Interfaces:**
- Consumes: alle Komponenten aus Tasks 40–43, `holeNachrichten` (Task 36), `alsAnfrageSpeichern` (Task 39).
- Produces: die vollständige Route `/postfach`.

- [ ] **Step 1: `components/postfach/PostfachAnsicht.tsx` anlegen**

Einziger Client-Grenzübergang der Seite — hält Auswahl und Filter lokal, keine Bibliothek nötig.

```tsx
"use client"

import { useState } from "react"
import { NachrichtenListe, type PostfachFilter } from "./NachrichtenListe"
import { EingangDetail } from "./EingangDetail"
import { EntwurfDetail } from "./EntwurfDetail"
import { MailEinfuegen } from "./MailEinfuegen"
import { alsAnfrageSpeichern } from "@/app/actions/nachrichten"
import type { NachrichtRow } from "@/lib/queries/nachrichten"

export function PostfachAnsicht({ nachrichten }: { nachrichten: NachrichtRow[] }) {
  const [filter, setFilter] = useState<PostfachFilter>("alle")
  const [ausgewaehlteId, setAusgewaehlteId] = useState<string | null>(nachrichten[0]?.id ?? null)

  const ausgewaehlt = nachrichten.find((n) => n.id === ausgewaehlteId) ?? null

  function rueckfrageOeffnen(vonEmail: string) {
    const treffer = nachrichten.find(
      (n) => n.richtung === "entwurf" && n.typ === "rueckfrage" && n.an === vonEmail
    )
    if (treffer) {
      setFilter("entwurf")
      setAusgewaehlteId(treffer.id)
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,340px)_minmax(0,1fr)] items-start gap-4">
      <div className="flex flex-col gap-3">
        <MailEinfuegen />
        <NachrichtenListe
          nachrichten={nachrichten}
          filter={filter}
          ausgewaehlteId={ausgewaehlteId}
          onFilterWechsel={setFilter}
          onAuswahl={setAusgewaehlteId}
        />
      </div>
      <div className="rounded-card border border-line bg-surface">
        {!ausgewaehlt && <p className="p-10 text-center text-sm text-ink-3">Nachricht wählen.</p>}
        {ausgewaehlt?.richtung === "eingang" && (
          <EingangDetail
            nachricht={ausgewaehlt}
            onSpeichern={() => void alsAnfrageSpeichern(ausgewaehlt.id)}
            onRueckfrageOeffnen={() => rueckfrageOeffnen(ausgewaehlt.von)}
          />
        )}
        {ausgewaehlt && ausgewaehlt.richtung !== "eingang" && <EntwurfDetail nachricht={ausgewaehlt} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `app/(app)/postfach/page.tsx` anlegen**

```tsx
import { Header } from "@/components/layout/Header"
import { PostfachAnsicht } from "@/components/postfach/PostfachAnsicht"
import { holeNachrichten } from "@/lib/queries/nachrichten"

export default async function PostfachPage() {
  const nachrichten = await holeNachrichten()

  return (
    <>
      <Header titel="Postfach" untertitel="Eingang und Entwürfe" />
      <main className="flex-1 overflow-y-auto p-5">
        <PostfachAnsicht nachrichten={nachrichten} />
      </main>
    </>
  )
}
```

- [ ] **Step 3: Manuell end-to-end prüfen**

Run: `npm run dev`, angemeldet auf `/postfach` öffnen, „Neue Mail einfügen" klicken, folgenden Text einfügen:

```
Guten Tag

Wir suchen eine Produktionsfläche von rund 900 bis 1'400 m² im Wasseramt. Bezug wäre Frühling 2027.

Freundliche Grüsse
B. Frei
```

Absender-E-Mail `b.frei@thermo-kunststoff.ch`, Betreff „Suche Produktionsfläche", „Übernehmen" klicken.

Expected: Eine neue Eingang-Nachricht erscheint, „PULS hat erkannt" zeigt Fläche/Ort/Bezug korrekt, Budget/Firma/Branche als **?** (Firma stand nicht im Beispieltext). Unter „Entwürfe" erscheint automatisch eine vorbereitete Rückfrage-Mail an `b.frei@thermo-kunststoff.ch`, die genau nach den fehlenden Angaben fragt.

- [ ] **Step 4: Freigabestufe 1 prüfen**

Expected: Der Entwurf aus Schritt 3 hat **kein** gesetztes Sendedatum (auf Stufe 1, dem Standard, verlässt nichts das System ohne Klick). „Senden" im Entwurf klicken — Expected: Status wechselt auf „Gesendet".

- [ ] **Step 5: Freigabestufe 2 prüfen**

In der Seitenleiste auf Stufe „2" wechseln, eine zweite unvollständige Mail einfügen.
Expected: Der neu erzeugte Rückfrage-Entwurf ist sofort als „Gesendet" markiert, ohne Klick auf „Senden" — Spec D10 bestätigt.

- [ ] **Step 6: Commit**

```bash
git add components/postfach/PostfachAnsicht.tsx "app/(app)/postfach"
git commit -m "feat: Postfach-Seite mit KI-Mailerkennung zusammensetzen"
```

---

### Task 45: Sidebar-Badge mit echter Anzahl verbinden

**Files:**
- Modify: `lib/queries/nachrichten.ts` (nutzt bereits vorhandenes `zaehleNachrichten`, Task 36)
- Modify: `components/layout/Sidebar.tsx`
- Modify: `app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `zaehleNachrichten` (Task 36).
- Produces: die im Prototyp gezeigte Zahl neben „Postfach" (ausgeblendet bei 0, wie im Original).

- [ ] **Step 1: `Sidebar.tsx` um einen Badge-Parameter erweitern**

In `components/layout/Sidebar.tsx` das `EINTRAEGE`-Array durch eine Funktion ersetzen, die den Postfach-Eintrag mit einem optionalen Badge rendert:

```tsx
export function Sidebar({ profil, postfachAnzahl }: { profil: Profil; postfachAnzahl: number }) {
```

Im JSX-Block der Navigation, beim Eintrag mit `pfad === "/postfach"`, nach dem Label ergänzen:

```tsx
{eintrag.pfad === "/postfach" && postfachAnzahl > 0 && (
  <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-on-brand">
    {postfachAnzahl}
  </span>
)}
```

- [ ] **Step 2: `app/(app)/layout.tsx` um die Zählung erweitern**

```tsx
import { zaehleNachrichten } from "@/lib/queries/nachrichten"
// ...
const [profil, postfachAnzahl] = await Promise.all([holeEigenesProfil(), zaehleNachrichten()])
// ...
<Sidebar profil={profil} postfachAnzahl={postfachAnzahl} />
```

- [ ] **Step 3: Manuell prüfen**

Run: `npm run dev`
Expected: Neben „Postfach" erscheint die Anzahl der Nachrichten aus M5, Task 44's manuellem Test.

- [ ] **Step 4: Commit**

```bash
git add components/layout/Sidebar.tsx "app/(app)/layout.tsx"
git commit -m "feat: Postfach-Badge in der Seitenleiste mit echter Anzahl"
```

---

### Task 46: Meilenstein M5 abschliessen

- [ ] **Step 1: Abnahme gegen Spec D7/D9/D10 prüfen**

`app/actions/nachrichten.ts` enthält genau eine Funktion, die nach dem Rohtext-Empfang alles Weitere übernimmt (`nachrichtEingegangen`) — ein künftiger IMAP-Adapter würde nur diese Funktion aufrufen. `lib/ki/erkennung.ts` und `lib/ki/entwuerfe.ts` sind für Prompt-Bau und Antwort-Parsing durch Tests abgedeckt (`npm run test` zeigt sie). Freigabestufen sind in der Server Action geprüft, nicht nur in der Oberfläche.

- [ ] **Step 2: Vollständigen Check laufen lassen**

Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`
Expected: alle vier ohne Fehler.

- [ ] **Step 3: Pull Request öffnen, CI abwarten, mergen**

```bash
git push -u origin feature/m5-postfach-ki
gh pr create --title "M5: Postfach mit KI-Mailerkennung" --base main
gh pr merge --squash
git checkout main && git pull
```

---

## Meilenstein M6 · Anfragen

### Task 47: Query-Funktionen erweitern — `anfragen`, minimales `objekte`, `matches`

`anfragen_sichtbar` (die View aus M1, Task 11) ist eine Postgres-View ohne eigene Fremdschlüssel-Metadaten — PostgREST kann Firmennamen darüber nicht zuverlässig automatisch mit einbetten (`select=*,firmen(name)`). Deshalb zwei getrennte Abfragen mit Verknüpfung im Code, statt einer riskanten impliziten Einbettung über die View.

**Files:**
- Modify: `lib/queries/anfragen.ts`
- Create: `lib/queries/objekte.ts`
- Create: `lib/queries/matches.ts`

**Interfaces:**
- Consumes: `berechneMatch` (M2 Task 21), `anfragen_sichtbar` (M1 Task 11).
- Produces: `holeAnfragen()`, `holeAnfrage(id)`, `aktualisiereAnfrage(id, aenderung)`, `zuAnfrageDomain(row)`, `holeVerlaufFuerAnfrage(id)`; `holeVerfuegbareObjekte()`, `zuObjektDomain(row)`; `berechneUndSpeichereMatchesFuerAnfrage(anfrageId)`, `holeBesterMatchFuerAnfrage(anfrageId)` — verwendet von `app/actions/anfragen.ts` (Task 48) und `AnfrageDetail` (Task 50).

- [ ] **Step 1: `lib/queries/anfragen.ts` erweitern**

```ts
import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import type { Anfrage } from "@/types"

type AnfrageEinfuegen = Database["public"]["Tables"]["anfragen"]["Insert"]
type AnfrageRow = Database["public"]["Tables"]["anfragen"]["Row"]
type AnfrageSichtbarRow = Database["public"]["Views"]["anfragen_sichtbar"]["Row"]
export type AnfrageMitFirma = AnfrageSichtbarRow & { firma: { name: string; website: string | null } | null }

export async function legeAnfrageAn(anfrage: AnfrageEinfuegen): Promise<AnfrageRow> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").insert(anfrage).select().single()
  if (error) throw error
  return data
}

export async function holeAnfragen(): Promise<AnfrageMitFirma[]> {
  const supabase = await erstelleServerClient()
  const [{ data: anfragenData, error: anfragenError }, { data: firmenData, error: firmenError }] = await Promise.all([
    supabase.from("anfragen_sichtbar").select("*").order("letzter_kontakt", { ascending: true }),
    supabase.from("firmen").select("id, name, website"),
  ])
  if (anfragenError) throw anfragenError
  if (firmenError) throw firmenError

  const firmenNachId = new Map(firmenData.map((f) => [f.id, f]))
  return anfragenData.map((a) => ({ ...a, firma: a.firma_id ? (firmenNachId.get(a.firma_id) ?? null) : null }))
}

export async function holeAnfrage(id: string): Promise<AnfrageRow | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data
}

export async function aktualisiereAnfrage(id: string, aenderung: Partial<AnfrageEinfuegen>): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("anfragen").update(aenderung).eq("id", id)
  if (error) throw error
}

export function zuAnfrageDomain(row: AnfrageRow): Anfrage {
  return {
    id: row.id,
    flaecheMin: row.flaeche_min,
    flaecheMax: row.flaeche_max,
    ort: row.ort,
    budgetProM2: row.budget_pro_m2,
    bezug: row.bezug,
    nutzung: row.nutzung,
    anforderungen: row.anforderungen as Record<string, boolean | number | string>,
    letzterKontakt: new Date(row.letzter_kontakt),
  }
}

export type VerlaufEintrag = { zeitpunkt: string; text: string }

// Kein eigenes Ereignis-Log im Schema (README nennt "Verlauf" im Drawer, ohne
// eine Tabelle dafür vorzusehen) — abgeleitet aus den Zeitstempeln, die
// ohnehin bereits existieren: Anlage, jeder erzeugte Match, jede gesendete Mail.
export async function holeVerlaufFuerAnfrage(anfrageId: string): Promise<VerlaufEintrag[]> {
  const supabase = await erstelleServerClient()
  const [
    { data: anfrageData, error: anfrageError },
    { data: matchesData, error: matchesError },
    { data: nachrichtenData, error: nachrichtenError },
  ] = await Promise.all([
    supabase.from("anfragen").select("created_at").eq("id", anfrageId).single(),
    supabase.from("matches").select("created_at, objekte(titel)").eq("anfrage_id", anfrageId),
    supabase.from("nachrichten").select("typ, gesendet_am").eq("anfrage_id", anfrageId).not("gesendet_am", "is", null),
  ])
  if (anfrageError) throw anfrageError
  if (matchesError) throw matchesError
  if (nachrichtenError) throw nachrichtenError

  const TYP_TEXT: Record<string, string> = {
    angebot: "Angebot gesendet", rueckfrage: "Rückfrage gesendet", nachfass: "Nachfass gesendet", anfrage: "Gesendet",
  }

  const eintraege: VerlaufEintrag[] = [{ zeitpunkt: anfrageData.created_at, text: "Angelegt" }]
  for (const m of matchesData) {
    eintraege.push({ zeitpunkt: m.created_at, text: `Neu gematcht mit ${m.objekte?.titel ?? "Objekt"}` })
  }
  for (const n of nachrichtenData) {
    eintraege.push({ zeitpunkt: n.gesendet_am as string, text: TYP_TEXT[n.typ] ?? "Gesendet" })
  }

  return eintraege.sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt))
}
```

- [ ] **Step 2: `lib/queries/objekte.ts` anlegen (minimal — vollständig ab M7)**

```ts
import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import type { Objekt } from "@/types"

type ObjektRow = Database["public"]["Tables"]["objekte"]["Row"]

export async function holeVerfuegbareObjekte(): Promise<ObjektRow[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("objekte").select("*").eq("status", "verfuegbar")
  if (error) throw error
  return data
}

export function zuObjektDomain(row: ObjektRow): Objekt {
  return {
    id: row.id,
    titel: row.titel,
    ort: row.ort,
    flaeche: row.flaeche,
    preisProM2: row.preis_pro_m2,
    nutzung: row.nutzung,
    eigenschaften: row.eigenschaften as Record<string, boolean | number | string>,
    verfuegbarAb: new Date(row.verfuegbar_ab),
  }
}
```

- [ ] **Step 3: `lib/queries/matches.ts` anlegen (Richtung Anfrage → Objekte — Gegenrichtung folgt in M7)**

`upsert` statt Löschen+Neuanlegen: ein bereits `gesendet`er oder `verworfen`er Match darf durch ein erneutes Berechnen nicht verschwinden, nur `status='neu'`-Zeilen werden bei einem nun zu schwachen Score entfernt.

```ts
import { erstelleServerClient } from "@/lib/supabase/server"
import { berechneMatch } from "@/lib/matching"
import { holeAnfrage, zuAnfrageDomain } from "./anfragen"
import { holeVerfuegbareObjekte, zuObjektDomain } from "./objekte"

export async function berechneUndSpeichereMatchesFuerAnfrage(anfrageId: string): Promise<void> {
  const [anfrageRow, objektRows] = await Promise.all([holeAnfrage(anfrageId), holeVerfuegbareObjekte()])
  if (!anfrageRow) return
  const anfrage = zuAnfrageDomain(anfrageRow)
  const supabase = await erstelleServerClient()

  for (const objektRow of objektRows) {
    const objekt = zuObjektDomain(objektRow)
    const match = berechneMatch(anfrage, objekt)
    if (match) {
      const { error } = await supabase
        .from("matches")
        .upsert(
          { anfrage_id: anfrage.id, objekt_id: objekt.id, score: match.score, kriterien: match.kriterien, hinweis: match.hinweis },
          { onConflict: "anfrage_id,objekt_id" }
        )
      if (error) throw error
    } else {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("anfrage_id", anfrage.id)
        .eq("objekt_id", objekt.id)
        .eq("status", "neu")
      if (error) throw error
    }
  }
}

export async function holeBesterMatchFuerAnfrage(anfrageId: string) {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("matches")
    .select("*, objekte(titel)")
    .eq("anfrage_id", anfrageId)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}
```

- [ ] **Step 4: Typecheck und Commit**

Run: `npx tsc --noEmit`

```bash
git checkout -b feature/m6-anfragen
git add lib/queries
git commit -m "feat: Anfragen-Query mit Firmenverknuepfung, minimales objekte.ts, matches.ts Richtung Anfrage"
```

---

### Task 48: Server Action `app/actions/anfragen.ts`

**Files:**
- Create: `app/actions/anfragen.ts`

**Interfaces:**
- Consumes: `legeAnfrageAn`, `aktualisiereAnfrage` (Task 47), `berechneUndSpeichereMatchesFuerAnfrage` (Task 47).
- Produces: `anfrageAnlegen(anfrage)`, `anfrageAktualisieren(id, aenderung)` — verwendet von `AnfrageFormular` und `AnfrageDetail` (Tasks 50–51).

- [ ] **Step 1: `app/actions/anfragen.ts` anlegen**

```ts
"use server"

import { revalidatePath } from "next/cache"
import { legeAnfrageAn, aktualisiereAnfrage } from "@/lib/queries/anfragen"
import { berechneUndSpeichereMatchesFuerAnfrage } from "@/lib/queries/matches"
import type { Database } from "@/types/database"

type AnfrageEinfuegen = Database["public"]["Tables"]["anfragen"]["Insert"]

export async function anfrageAnlegen(anfrage: AnfrageEinfuegen): Promise<void> {
  const neue = await legeAnfrageAn(anfrage)
  await berechneUndSpeichereMatchesFuerAnfrage(neue.id)
  revalidatePath("/anfragen")
  revalidatePath("/")
}

export async function anfrageAktualisieren(id: string, aenderung: Partial<AnfrageEinfuegen>): Promise<void> {
  await aktualisiereAnfrage(id, aenderung)
  await berechneUndSpeichereMatchesFuerAnfrage(id)
  revalidatePath("/anfragen")
  revalidatePath("/")
}
```

- [ ] **Step 2: Typecheck und Commit**

```bash
git add app/actions/anfragen.ts
git commit -m "feat: anfrageAnlegen und anfrageAktualisieren mit Rematching"
```

---

### Task 49: `AnfragenTabelle`

**Files:**
- Create: `components/anfragen/AnfragenTabelle.tsx`

**Interfaces:**
- Consumes: `Chip` (M4 Task 30), `puls`/`pulsFarbe` (M2 Task 16), `AnfrageMitFirma` (Task 47).
- Produces: `<AnfragenTabelle anfragen onZeileWahl />`.

- [ ] **Step 1: `components/anfragen/AnfragenTabelle.tsx` anlegen**

```tsx
import { Chip } from "@/components/ui/Chip"
import { puls, pulsFarbe } from "@/lib/puls"
import type { AnfrageMitFirma } from "@/lib/queries/anfragen"

function mapsLink(ort: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ort}, Schweiz`)}`
}

const CHIP_FARBE: Record<ReturnType<typeof pulsFarbe>, "gut" | "warn" | "kritisch"> = {
  gut: "gut", warn: "warn", kritisch: "kritisch",
}

export function AnfragenTabelle({
  anfragen, onZeileWahl,
}: {
  anfragen: AnfrageMitFirma[]
  onZeileWahl: (id: string, bearbeitenSofort: boolean) => void
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr>
            {["Firma", "Sucht", "Ort", "Budget", "Bezug", "Status"].map((kopf) => (
              <th key={kopf} className="border-b border-line px-4 py-2.5 text-left text-xs font-medium text-ink-3">
                {kopf}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {anfragen.map((a) => {
            const tage = Math.floor((Date.now() - new Date(a.letzter_kontakt).getTime()) / 86_400_000)
            const wert = puls(new Date(a.letzter_kontakt))
            // Ein Klick direkt auf eine ?-Lücke öffnet den Drawer sofort im
            // Bearbeiten-Modus (README-Anforderung); ein Klick auf die Zeile
            // sonst nur zur Ansicht. stopPropagation auf dem ?-Span verhindert,
            // dass der Zeilen-Handler zusätzlich mit bearbeitenSofort=false feuert.
            const luecke = (
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  onZeileWahl(a.id, true)
                }}
                className="font-display text-base font-bold text-warn"
              >
                ?
              </span>
            )
            return (
              <tr
                key={a.id}
                onClick={() => onZeileWahl(a.id, false)}
                className="cursor-pointer border-b border-line last:border-b-0 hover:bg-surface-2"
              >
                <td className="px-4 py-2.5 text-sm font-medium text-ink">
                  <div className="flex items-center gap-2">
                    {a.firma?.name ?? (a.vertraulich ? "—" : luecke)}
                    {a.vertraulich && (
                      <span className="rounded border border-line-2 px-1 text-[11px] font-normal text-ink-3">
                        vertraulich
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-sm text-ink-2">
                  {a.flaeche_min ?? "?"}–{a.flaeche_max ?? "?"} m²
                </td>
                <td className="px-4 py-2.5 text-sm text-ink-2">
                  {a.ort ? (
                    <a
                      href={mapsLink(a.ort)}
                      target="_blank"
                      rel="noopener"
                      onClick={(e) => e.stopPropagation()}
                      className="text-brand hover:underline"
                    >
                      {a.ort} ↗
                    </a>
                  ) : (
                    luecke
                  )}
                </td>
                <td className="px-4 py-2.5 text-sm text-ink-2">
                  {a.budget_pro_m2 !== null ? `CHF ${a.budget_pro_m2}/m²` : luecke}
                </td>
                <td className="px-4 py-2.5 text-sm text-ink-2">{a.bezug ?? luecke}</td>
                <td className="px-4 py-2.5 text-sm">
                  <Chip kind={CHIP_FARBE[pulsFarbe(wert)]}>{tage > 20 ? `${tage} Tage` : "aktuell"}</Chip>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck und Commit**

```bash
git add components/anfragen/AnfragenTabelle.tsx
git commit -m "feat: AnfragenTabelle mit Lücken als ?"
```

---

### Task 50: `AnfrageDetail` (Drawer mit Inline-Bearbeitung und bestem Treffer)

**Files:**
- Create: `components/anfragen/AnfrageDetail.tsx`

**Interfaces:**
- Consumes: `Drawer` (M4 Task 33), `anfrageAktualisieren` (Task 48), `holeBesterMatchFuerAnfrage`/`holeVerlaufFuerAnfrage` (Task 47), `puls`/`pulsFarbe` (M2 Task 16), `formatDatum` (M2 Task 15).
- Produces: `<AnfrageDetail anfrage besterMatch verlauf offen sofortBearbeiten onSchliessen />`.

- [ ] **Step 1: `components/anfragen/AnfrageDetail.tsx` anlegen**

```tsx
import { useState } from "react"
import { Drawer } from "@/components/layout/Drawer"
import { Button } from "@/components/ui/Button"
import { anfrageAktualisieren } from "@/app/actions/anfragen"
import { puls, pulsFarbe } from "@/lib/puls"
import { formatDatum } from "@/lib/format"
import type { AnfrageMitFirma, VerlaufEintrag } from "@/lib/queries/anfragen"
import type { Kriterium } from "@/types"

type BesterMatch = { score: number; kriterien: Kriterium[]; objekte: { titel: string } | null } | null

const FARBE_KLASSE: Record<ReturnType<typeof pulsFarbe>, string> = {
  gut: "text-good", warn: "text-warn", kritisch: "text-crit",
}

export function AnfrageDetail({
  anfrage, besterMatch, verlauf, offen, sofortBearbeiten, onSchliessen,
}: {
  anfrage: AnfrageMitFirma
  besterMatch: BesterMatch
  verlauf: VerlaufEintrag[]
  offen: boolean
  sofortBearbeiten: boolean
  onSchliessen: () => void
}) {
  // sofortBearbeiten kommt von einem Klick direkt auf eine ?-Lücke in der
  // Tabelle (README-Anforderung) — dann startet der Drawer im Bearbeiten-Modus.
  const [bearbeiten, setBearbeiten] = useState(sofortBearbeiten)
  const [flaecheMin, setFlaecheMin] = useState(anfrage.flaeche_min?.toString() ?? "")
  const [flaecheMax, setFlaecheMax] = useState(anfrage.flaeche_max?.toString() ?? "")
  const [ort, setOrt] = useState(anfrage.ort ?? "")
  const [budget, setBudget] = useState(anfrage.budget_pro_m2?.toString() ?? "")
  const [bezug, setBezug] = useState(anfrage.bezug ?? "")

  const wert = puls(new Date(anfrage.letzter_kontakt))
  const tage = Math.floor((Date.now() - new Date(anfrage.letzter_kontakt).getTime()) / 86_400_000)

  async function speichern() {
    await anfrageAktualisieren(anfrage.id, {
      flaeche_min: flaecheMin ? Number(flaecheMin) : null,
      flaeche_max: flaecheMax ? Number(flaecheMax) : null,
      ort: ort || null,
      budget_pro_m2: budget ? Number(budget) : null,
      bezug: bezug || null,
    })
    setBearbeiten(false)
  }

  return (
    <Drawer
      offen={offen}
      onSchliessen={onSchliessen}
      titel={anfrage.firma?.name ?? "Anfrage"}
      untertitel={`seit ${tage} Tagen`}
    >
      <div>
        <div className="mb-2.5 border-b border-line pb-1.5 text-xs text-ink-3">Daten</div>
        {bearbeiten ? (
          <div className="grid grid-cols-[auto_1fr] items-center gap-2 text-sm">
            <label className="text-xs text-ink-3">Fläche ab</label>
            <input value={flaecheMin} onChange={(e) => setFlaecheMin(e.target.value)} className="rounded-lg border border-line-2 px-2 py-1" />
            <label className="text-xs text-ink-3">Fläche bis</label>
            <input value={flaecheMax} onChange={(e) => setFlaecheMax(e.target.value)} className="rounded-lg border border-line-2 px-2 py-1" />
            <label className="text-xs text-ink-3">Ort</label>
            <input value={ort} onChange={(e) => setOrt(e.target.value)} className="rounded-lg border border-line-2 px-2 py-1" placeholder="fehlt" />
            <label className="text-xs text-ink-3">Budget</label>
            <input value={budget} onChange={(e) => setBudget(e.target.value)} className="rounded-lg border border-line-2 px-2 py-1" placeholder="fehlt" />
            <label className="text-xs text-ink-3">Bezug</label>
            <input value={bezug} onChange={(e) => setBezug(e.target.value)} className="rounded-lg border border-line-2 px-2 py-1" placeholder="fehlt" />
          </div>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-1.5 text-sm">
            <dt className="text-xs text-ink-3">Sucht</dt>
            <dd>{anfrage.flaeche_min ?? "?"}–{anfrage.flaeche_max ?? "?"} m²</dd>
            <dt className="text-xs text-ink-3">Ort</dt>
            <dd>{anfrage.ort ?? "?"}</dd>
            <dt className="text-xs text-ink-3">Budget</dt>
            <dd>{anfrage.budget_pro_m2 ?? "?"}</dd>
            <dt className="text-xs text-ink-3">Bezug</dt>
            <dd>{anfrage.bezug ?? "?"}</dd>
            <dt className="text-xs text-ink-3">Puls</dt>
            <dd className={`font-semibold ${FARBE_KLASSE[pulsFarbe(wert)]}`}>{wert}</dd>
          </dl>
        )}
        <div className="mt-3 flex gap-2">
          {bearbeiten ? (
            <>
              <Button variante="primaer" onClick={speichern}>Speichern</Button>
              <Button onClick={() => setBearbeiten(false)}>Abbrechen</Button>
            </>
          ) : (
            <Button onClick={() => setBearbeiten(true)}>Bearbeiten</Button>
          )}
        </div>
      </div>

      {besterMatch && (
        <div>
          <div className="mb-2.5 border-b border-line pb-1.5 text-xs text-ink-3">
            Bester Treffer · {besterMatch.objekte?.titel ?? "?"}
          </div>
          {besterMatch.kriterien.map((k) => (
            <div key={k.kriterium} className="mb-1.5 grid grid-cols-[78px_1fr_34px] items-center gap-2.5 text-xs">
              <span>{k.kriterium}</span>
              <span className="h-1.5 overflow-hidden rounded bg-surface-3">
                <span
                  className={`block h-full ${k.status === "ok" ? "bg-brand" : k.status === "teilweise" ? "bg-warn" : "bg-crit"}`}
                  style={{ width: `${k.status === "ok" ? 100 : k.status === "teilweise" ? 60 : 20}%` }}
                />
              </span>
              <span className="text-right text-ink-2">{besterMatch.score}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="mb-2.5 border-b border-line pb-1.5 text-xs text-ink-3">Verlauf</div>
        <ul>
          {verlauf.map((eintrag, i) => (
            <li key={i} className="grid grid-cols-[74px_1fr] gap-2.5 border-b border-line py-1.5 text-xs text-ink-2 last:border-b-0">
              <time className="text-ink-3">{formatDatum(new Date(eintrag.zeitpunkt))}</time>
              <span>{eintrag.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </Drawer>
  )
}
```

- [ ] **Step 2: Typecheck und Commit**

```bash
git add components/anfragen/AnfrageDetail.tsx
git commit -m "feat: AnfrageDetail mit Inline-Bearbeitung, bestem Treffer und Verlauf"
```

---

### Task 51: `AnfrageFormular`

**Files:**
- Create: `components/anfragen/AnfrageFormular.tsx`

**Interfaces:**
- Consumes: `anfrageAnlegen` (Task 48).
- Produces: `<AnfrageFormular onFertig />`.

- [ ] **Step 1: `components/anfragen/AnfrageFormular.tsx` anlegen**

```tsx
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { anfrageAnlegen } from "@/app/actions/anfragen"
import type { Nutzung } from "@/types"

const NUTZUNGEN: Nutzung[] = ["buero", "gewerbe", "produktion", "lager", "verkauf", "bauland"]

export function AnfrageFormular({ onFertig }: { onFertig: () => void }) {
  const [ort, setOrt] = useState("")
  const [nutzung, setNutzung] = useState<Nutzung>("gewerbe")
  const [flaecheMin, setFlaecheMin] = useState("")
  const [flaecheMax, setFlaecheMax] = useState("")
  const [budget, setBudget] = useState("")
  const [bezug, setBezug] = useState("")
  const [speichert, setSpeichert] = useState(false)

  async function absenden() {
    setSpeichert(true)
    await anfrageAnlegen({
      ort: ort || null,
      nutzung,
      flaeche_min: flaecheMin ? Number(flaecheMin) : null,
      flaeche_max: flaecheMax ? Number(flaecheMax) : null,
      budget_pro_m2: budget ? Number(budget) : null,
      bezug: bezug || null,
    })
    setSpeichert(false)
    onFertig()
  }

  return (
    <div className="flex flex-col gap-2.5 text-sm">
      <input placeholder="Ort" value={ort} onChange={(e) => setOrt(e.target.value)} className="rounded-lg border border-line-2 px-2.5 py-1.5" />
      <select value={nutzung} onChange={(e) => setNutzung(e.target.value as Nutzung)} className="rounded-lg border border-line-2 px-2.5 py-1.5">
        {NUTZUNGEN.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <input placeholder="Fläche ab" value={flaecheMin} onChange={(e) => setFlaecheMin(e.target.value)} className="w-1/2 rounded-lg border border-line-2 px-2.5 py-1.5" />
        <input placeholder="Fläche bis" value={flaecheMax} onChange={(e) => setFlaecheMax(e.target.value)} className="w-1/2 rounded-lg border border-line-2 px-2.5 py-1.5" />
      </div>
      <input placeholder="Budget CHF/m² (optional)" value={budget} onChange={(e) => setBudget(e.target.value)} className="rounded-lg border border-line-2 px-2.5 py-1.5" />
      <input placeholder="Bezug (optional)" value={bezug} onChange={(e) => setBezug(e.target.value)} className="rounded-lg border border-line-2 px-2.5 py-1.5" />
      <Button variante="primaer" onClick={absenden} disabled={speichert}>
        {speichert ? "…" : "Anfrage anlegen"}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck und Commit**

```bash
git add components/anfragen/AnfrageFormular.tsx
git commit -m "feat: AnfrageFormular fuer manuelle Neuanlage"
```

---

### Task 52: Anfragen-Seite zusammensetzen

**Files:**
- Create: `components/anfragen/AnfragenAnsicht.tsx`
- Create: `app/api/anfragen/[id]/detail/route.ts`
- Create: `app/(app)/anfragen/page.tsx`

**Interfaces:**
- Consumes: `AnfragenTabelle` (Task 49), `AnfrageDetail` (Task 50), `AnfrageFormular` (Task 51), `holeAnfragen` (Task 47), `holeBesterMatchFuerAnfrage`/`holeVerlaufFuerAnfrage` (Task 47).
- Produces: die Route `/anfragen` und die Hilfsroute `GET /api/anfragen/[id]/detail`.

- [ ] **Step 1: `components/anfragen/AnfragenAnsicht.tsx` anlegen**

```tsx
"use client"

import { useEffect, useState } from "react"
import { AnfragenTabelle } from "./AnfragenTabelle"
import { AnfrageDetail } from "./AnfrageDetail"
import { AnfrageFormular } from "./AnfrageFormular"
import { Drawer } from "@/components/layout/Drawer"
import { Button } from "@/components/ui/Button"
import type { AnfrageMitFirma, VerlaufEintrag } from "@/lib/queries/anfragen"
import type { Kriterium } from "@/types"

type BesterMatch = { score: number; kriterien: Kriterium[]; objekte: { titel: string } | null } | null
type DetailDaten = { besterMatch: BesterMatch; verlauf: VerlaufEintrag[] }

export function AnfragenAnsicht({ anfragen }: { anfragen: AnfrageMitFirma[] }) {
  const [ausgewaehlteId, setAusgewaehlteId] = useState<string | null>(null)
  const [sofortBearbeiten, setSofortBearbeiten] = useState(false)
  const [neuOffen, setNeuOffen] = useState(false)
  const [detailDaten, setDetailDaten] = useState<DetailDaten>({ besterMatch: null, verlauf: [] })

  const ausgewaehlt = anfragen.find((a) => a.id === ausgewaehlteId) ?? null

  function zeileWaehlen(id: string, bearbeitenSofort: boolean) {
    setAusgewaehlteId(id)
    setSofortBearbeiten(bearbeitenSofort)
  }

  useEffect(() => {
    if (!ausgewaehlteId) {
      setDetailDaten({ besterMatch: null, verlauf: [] })
      return
    }
    fetch(`/api/anfragen/${ausgewaehlteId}/detail`)
      .then((res) => (res.ok ? res.json() : { besterMatch: null, verlauf: [] }))
      .then(setDetailDaten)
  }, [ausgewaehlteId])

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button variante="primaer" onClick={() => setNeuOffen(true)}>Neue Anfrage</Button>
      </div>
      <AnfragenTabelle anfragen={anfragen} onZeileWahl={zeileWaehlen} />
      <p className="mt-2 text-xs text-ink-3">? = Angabe fehlt noch</p>

      {ausgewaehlt && (
        <AnfrageDetail
          anfrage={ausgewaehlt}
          besterMatch={detailDaten.besterMatch}
          verlauf={detailDaten.verlauf}
          offen={!!ausgewaehlteId}
          sofortBearbeiten={sofortBearbeiten}
          onSchliessen={() => setAusgewaehlteId(null)}
        />
      )}

      <Drawer offen={neuOffen} titel="Neue Anfrage" untertitel="" onSchliessen={() => setNeuOffen(false)}>
        <AnfrageFormular onFertig={() => setNeuOffen(false)} />
      </Drawer>
    </>
  )
}
```

Bester Treffer und Verlauf werden über eine kleine Route Handler-API nachgeladen (`fetch`), weil eine Server Action naturgemäss für *Schreiboperationen* gedacht ist — einfaches Lesen bei Auswahl passt besser zu einem GET-Endpunkt.

- [ ] **Step 2: Route Handler `app/api/anfragen/[id]/detail/route.ts` anlegen**

```ts
import { NextResponse } from "next/server"
import { holeBesterMatchFuerAnfrage } from "@/lib/queries/matches"
import { holeVerlaufFuerAnfrage } from "@/lib/queries/anfragen"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [besterMatch, verlauf] = await Promise.all([holeBesterMatchFuerAnfrage(id), holeVerlaufFuerAnfrage(id)])
  return NextResponse.json({ besterMatch, verlauf })
}
```

- [ ] **Step 3: `app/(app)/anfragen/page.tsx` anlegen**

```tsx
import { Header } from "@/components/layout/Header"
import { AnfragenAnsicht } from "@/components/anfragen/AnfragenAnsicht"
import { holeAnfragen } from "@/lib/queries/anfragen"

export default async function AnfragenPage() {
  const anfragen = await holeAnfragen()

  return (
    <>
      <Header titel="Anfragen" untertitel={`${anfragen.length} offen`} />
      <main className="flex-1 overflow-y-auto p-5">
        <AnfragenAnsicht anfragen={anfragen} />
      </main>
    </>
  )
}
```

- [ ] **Step 4: Manuell prüfen — README-Abnahmekriterium**

Run: `npm run dev`, auf `/anfragen` „Neue Anfrage" klicken, nur Ort und Nutzung ausfüllen (Budget und Bezug leer lassen), „Anfrage anlegen" klicken.
Expected: Die Zeile erscheint sofort in der Tabelle, Budget und Bezug zeigen **?**. Auf die Zeile ausserhalb eines **?** klicken öffnet den Drawer zur Ansicht. Auf ein **?** direkt klicken öffnet denselben Drawer sofort im Bearbeiten-Modus (README: „Ein Klick direkt auf ein ? in der Tabelle öffnet sofort den Bearbeiten-Modus").

- [ ] **Step 5: Commit**

```bash
git add components/anfragen/AnfragenAnsicht.tsx "app/api/anfragen" "app/(app)/anfragen"
git commit -m "feat: Anfragen-Seite zusammensetzen"
```

---

### Task 53: Meilenstein M6 abschliessen

- [ ] **Step 1: Abnahmekriterium erneut end-to-end prüfen**

Eine Anfrage ohne Budget und ohne Bezugstermin lässt sich speichern (Task 52, Step 4) — Lücken erscheinen in Tabelle **und** im Drawer als `?` (README-Abnahmekriterium wörtlich erfüllt).

- [ ] **Step 2: Vollständigen Check laufen lassen**

Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`

- [ ] **Step 3: Pull Request öffnen, CI abwarten, mergen**

```bash
git push -u origin feature/m6-anfragen
gh pr create --title "M6: Anfragen" --base main
gh pr merge --squash
git checkout main && git pull
```

---

## Meilenstein M7 · Objekte und bidirektionales Rematching

Das ist der Kern des Projekts (README: „nicht nur jede neue Anfrage gegen den Objektbestand, sondern bei jedem neuen Objekt gegen alle offenen Anfragen, auch Monate alte"). Die Anfrage-Richtung steht seit M6 (Task 47); hier kommt die Objekt-Richtung dazu.

### Task 54: `lib/queries/objekte.ts` vervollständigen, `lib/queries/matches.ts` um die Objekt-Richtung erweitern

**Files:**
- Modify: `lib/queries/objekte.ts`
- Modify: `lib/queries/anfragen.ts`
- Modify: `lib/queries/matches.ts`

**Interfaces:**
- Produces: `holeObjekte()`, `holeObjekt(id)`, `legeObjektAn(...)`, `aktualisiereObjekt(id, aenderung)`, `zaehleMatchesFuerObjekt(id)`; `holeOffeneAnfragen()`; `berechneUndSpeichereMatchesFuerObjekt(objektId)`.

- [ ] **Step 1: `lib/queries/objekte.ts` erweitern**

```ts
type ObjektEinfuegen = Database["public"]["Tables"]["objekte"]["Insert"]

export async function holeObjekte(): Promise<ObjektRow[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("objekte").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function holeObjekt(id: string): Promise<ObjektRow | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("objekte").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data
}

export async function legeObjektAn(objekt: ObjektEinfuegen): Promise<ObjektRow> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("objekte").insert(objekt).select().single()
  if (error) throw error
  return data
}

export async function aktualisiereObjekt(id: string, aenderung: Partial<ObjektEinfuegen>): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("objekte").update(aenderung).eq("id", id)
  if (error) throw error
}

export async function zaehleMatchesFuerObjekt(objektId: string): Promise<number> {
  const supabase = await erstelleServerClient()
  const { count, error } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("objekt_id", objektId)
  if (error) throw error
  return count ?? 0
}
```

(Die bestehenden Importe und `holeVerfuegbareObjekte`/`zuObjektDomain` aus Task 47 bleiben unverändert stehen.)

- [ ] **Step 2: `lib/queries/anfragen.ts` um `holeOffeneAnfragen` erweitern**

```ts
export async function holeOffeneAnfragen(): Promise<AnfrageRow[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").select("*").eq("status", "offen")
  if (error) throw error
  return data
}
```

- [ ] **Step 3: `lib/queries/matches.ts` um die Objekt-Richtung erweitern**

Bewusst eine zweite, fast identische Funktion statt einer gemeinsamen Abstraktion: erst beim dritten ähnlichen Fall würde sich das Zusammenfassen lohnen (README-Coderegel „keine Abstraktion vor der dritten Wiederholung").

```ts
import { holeOffeneAnfragen } from "./anfragen"
import { holeObjekt } from "./objekte"

export async function berechneUndSpeichereMatchesFuerObjekt(objektId: string): Promise<void> {
  const [objektRow, anfrageRows] = await Promise.all([holeObjekt(objektId), holeOffeneAnfragen()])
  if (!objektRow) return
  const objekt = zuObjektDomain(objektRow)
  const supabase = await erstelleServerClient()

  for (const anfrageRow of anfrageRows) {
    const anfrage = zuAnfrageDomain(anfrageRow)
    const match = berechneMatch(anfrage, objekt)
    if (match) {
      const { error } = await supabase
        .from("matches")
        .upsert(
          { anfrage_id: anfrage.id, objekt_id: objekt.id, score: match.score, kriterien: match.kriterien, hinweis: match.hinweis },
          { onConflict: "anfrage_id,objekt_id" }
        )
      if (error) throw error
    } else {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("anfrage_id", anfrage.id)
        .eq("objekt_id", objekt.id)
        .eq("status", "neu")
      if (error) throw error
    }
  }
}
```

- [ ] **Step 4: Typecheck und Commit**

Run: `npx tsc --noEmit`

```bash
git checkout -b feature/m7-objekte
git add lib/queries
git commit -m "feat: Objekte-Query vervollstaendigen, Rematching Richtung Objekt -> Anfragen"
```

---

### Task 55: Server Action `app/actions/objekte.ts`

**Files:**
- Create: `app/actions/objekte.ts`

**Interfaces:**
- Consumes: `legeObjektAn`, `aktualisiereObjekt` (Task 54), `berechneUndSpeichereMatchesFuerObjekt` (Task 54).
- Produces: `objektAnlegen(objekt)`, `objektAktualisieren(id, aenderung)`.

- [ ] **Step 1: `app/actions/objekte.ts` anlegen**

```ts
"use server"

import { revalidatePath } from "next/cache"
import { legeObjektAn, aktualisiereObjekt } from "@/lib/queries/objekte"
import { berechneUndSpeichereMatchesFuerObjekt } from "@/lib/queries/matches"
import type { Database } from "@/types/database"

type ObjektEinfuegen = Database["public"]["Tables"]["objekte"]["Insert"]

export async function objektAnlegen(objekt: ObjektEinfuegen): Promise<void> {
  const neues = await legeObjektAn(objekt)
  await berechneUndSpeichereMatchesFuerObjekt(neues.id)
  revalidatePath("/objekte")
  revalidatePath("/")
}

export async function objektAktualisieren(id: string, aenderung: Partial<ObjektEinfuegen>): Promise<void> {
  await aktualisiereObjekt(id, aenderung)
  await berechneUndSpeichereMatchesFuerObjekt(id)
  revalidatePath("/objekte")
  revalidatePath("/")
}
```

- [ ] **Step 2: Typecheck und Commit**

```bash
git add app/actions/objekte.ts
git commit -m "feat: objektAnlegen und objektAktualisieren mit Rematching gegen alle offenen Anfragen"
```

---

### Task 56: `ObjektRaster`

**Files:**
- Create: `components/objekte/ObjektRaster.tsx`

**Interfaces:**
- Produces: `<ObjektRaster objekte treffer onKarteWahl />`.

- [ ] **Step 1: `components/objekte/ObjektRaster.tsx` anlegen**

```tsx
import type { Database } from "@/types/database"

type ObjektRow = Database["public"]["Tables"]["objekte"]["Row"]

function mapsLink(adresse: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`
}

export function ObjektRaster({
  objekte, treffer, onKarteWahl,
}: {
  objekte: ObjektRow[]
  treffer: Record<string, number>
  onKarteWahl: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
      {objekte.map((o) => (
        <article
          key={o.id}
          onClick={() => onKarteWahl(o.id)}
          className="cursor-pointer overflow-hidden rounded-card border border-line bg-surface"
        >
          <div className="grid h-32 place-items-center bg-surface-3 text-xs text-ink-3">
            {o.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- Fotos sind freie URLs ohne eigenen Upload (README: "zunächst als URL-Feld").
              <img src={o.foto_url} alt={o.titel} className="h-32 w-full object-cover" />
            ) : (
              "Foto"
            )}
          </div>
          <div className="p-3">
            <div className="text-sm font-semibold text-ink">{o.titel}</div>
            <div className="mt-0.5 text-xs text-ink-2">
              {o.flaeche} m² · {o.preis_pro_m2 !== null ? `CHF ${o.preis_pro_m2}/m²` : "auf Anfrage"}
            </div>
            <div className="mt-0.5 text-xs text-ink-2">{o.eigentuemer}</div>
            <div className="mt-1.5 flex items-center gap-2.5 text-xs">
              <a
                href={mapsLink(o.adresse)}
                target="_blank"
                rel="noopener"
                onClick={(e) => e.stopPropagation()}
                className="text-brand hover:underline"
              >
                Karte ↗
              </a>
              <span className="text-ink-3">{treffer[o.id] ?? 0} Treffer</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck und Commit**

```bash
git add components/objekte/ObjektRaster.tsx
git commit -m "feat: ObjektRaster"
```

---

### Task 57: `ObjektFormular` (Anlegen und Bearbeiten in einem)

**Files:**
- Create: `components/objekte/ObjektFormular.tsx`

**Interfaces:**
- Consumes: `objektAnlegen`, `objektAktualisieren` (Task 55).
- Produces: `<ObjektFormular objekt? onFertig />` — dieselbe Komponente für Anlegen (kein `objekt`-Prop) und Bearbeiten (mit `objekt`-Prop), wie das README verlangt.

- [ ] **Step 1: `components/objekte/ObjektFormular.tsx` anlegen**

```tsx
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { objektAnlegen, objektAktualisieren } from "@/app/actions/objekte"
import type { Database } from "@/types/database"
import type { Nutzung } from "@/types"

type ObjektRow = Database["public"]["Tables"]["objekte"]["Row"]
const NUTZUNGEN: Nutzung[] = ["buero", "gewerbe", "produktion", "lager", "verkauf", "bauland"]

export function ObjektFormular({ objekt, onFertig }: { objekt?: ObjektRow; onFertig: () => void }) {
  const [titel, setTitel] = useState(objekt?.titel ?? "")
  const [adresse, setAdresse] = useState(objekt?.adresse ?? "")
  const [ort, setOrt] = useState(objekt?.ort ?? "")
  const [flaeche, setFlaeche] = useState(objekt?.flaeche?.toString() ?? "")
  const [preis, setPreis] = useState(objekt?.preis_pro_m2?.toString() ?? "")
  const [nutzung, setNutzung] = useState<Nutzung>(objekt?.nutzung ?? "gewerbe")
  const [verfuegbarAb, setVerfuegbarAb] = useState(objekt?.verfuegbar_ab ?? "")
  const [eigentuemer, setEigentuemer] = useState(objekt?.eigentuemer ?? "")
  const [fotoUrl, setFotoUrl] = useState(objekt?.foto_url ?? "")
  const [speichert, setSpeichert] = useState(false)

  async function absenden() {
    setSpeichert(true)
    const werte = {
      titel, adresse, ort, flaeche: Number(flaeche),
      preis_pro_m2: preis ? Number(preis) : null,
      nutzung, verfuegbar_ab: verfuegbarAb, eigentuemer,
      foto_url: fotoUrl || null,
    }
    if (objekt) {
      await objektAktualisieren(objekt.id, werte)
    } else {
      await objektAnlegen(werte)
    }
    setSpeichert(false)
    onFertig()
  }

  const gueltig = titel && adresse && ort && flaeche && verfuegbarAb && eigentuemer

  return (
    <div className="flex flex-col gap-2.5 text-sm">
      <input placeholder="Titel" value={titel} onChange={(e) => setTitel(e.target.value)} className="rounded-lg border border-line-2 px-2.5 py-1.5" />
      <input placeholder="Adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} className="rounded-lg border border-line-2 px-2.5 py-1.5" />
      <input placeholder="Ort" value={ort} onChange={(e) => setOrt(e.target.value)} className="rounded-lg border border-line-2 px-2.5 py-1.5" />
      <div className="flex gap-2">
        <input placeholder="Fläche m²" value={flaeche} onChange={(e) => setFlaeche(e.target.value)} className="w-1/2 rounded-lg border border-line-2 px-2.5 py-1.5" />
        <input placeholder="Preis CHF/m² (optional)" value={preis} onChange={(e) => setPreis(e.target.value)} className="w-1/2 rounded-lg border border-line-2 px-2.5 py-1.5" />
      </div>
      <select value={nutzung} onChange={(e) => setNutzung(e.target.value as Nutzung)} className="rounded-lg border border-line-2 px-2.5 py-1.5">
        {NUTZUNGEN.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <input type="date" value={verfuegbarAb} onChange={(e) => setVerfuegbarAb(e.target.value)} className="rounded-lg border border-line-2 px-2.5 py-1.5" />
      <input placeholder="Eigentümer" value={eigentuemer} onChange={(e) => setEigentuemer(e.target.value)} className="rounded-lg border border-line-2 px-2.5 py-1.5" />
      <input placeholder="Foto-URL (optional)" value={fotoUrl} onChange={(e) => setFotoUrl(e.target.value)} className="rounded-lg border border-line-2 px-2.5 py-1.5" />
      <Button variante="primaer" onClick={absenden} disabled={speichert || !gueltig}>
        {speichert ? "…" : objekt ? "Änderungen speichern" : "Objekt anlegen"}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck und Commit**

```bash
git add components/objekte/ObjektFormular.tsx
git commit -m "feat: ObjektFormular fuer Anlegen und Bearbeiten"
```

---

### Task 58: Objekte-Seite zusammensetzen

**Files:**
- Create: `components/objekte/ObjekteAnsicht.tsx`
- Create: `app/(app)/objekte/page.tsx`

**Interfaces:**
- Consumes: `ObjektRaster` (Task 56), `ObjektFormular` (Task 57), `holeObjekte`/`zaehleMatchesFuerObjekt` (Task 54).
- Produces: die Route `/objekte`.

- [ ] **Step 1: `components/objekte/ObjekteAnsicht.tsx` anlegen**

```tsx
"use client"

import { useState } from "react"
import { ObjektRaster } from "./ObjektRaster"
import { ObjektFormular } from "./ObjektFormular"
import { Drawer } from "@/components/layout/Drawer"
import { Button } from "@/components/ui/Button"
import type { Database } from "@/types/database"

type ObjektRow = Database["public"]["Tables"]["objekte"]["Row"]

export function ObjekteAnsicht({
  objekte, treffer,
}: {
  objekte: ObjektRow[]
  treffer: Record<string, number>
}) {
  const [modus, setModus] = useState<string | null>(null)
  const bearbeitetesObjekt = modus && modus !== "neu" ? objekte.find((o) => o.id === modus) : undefined

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button variante="primaer" onClick={() => setModus("neu")}>
          Objekt anlegen
        </Button>
      </div>
      <ObjektRaster objekte={objekte} treffer={treffer} onKarteWahl={setModus} />

      <Drawer
        offen={modus !== null}
        titel={bearbeitetesObjekt ? bearbeitetesObjekt.titel : "Neues Objekt"}
        untertitel=""
        onSchliessen={() => setModus(null)}
      >
        <ObjektFormular objekt={bearbeitetesObjekt} onFertig={() => setModus(null)} />
      </Drawer>
    </>
  )
}
```

- [ ] **Step 2: `app/(app)/objekte/page.tsx` anlegen**

```tsx
import { Header } from "@/components/layout/Header"
import { ObjekteAnsicht } from "@/components/objekte/ObjekteAnsicht"
import { holeObjekte, zaehleMatchesFuerObjekt } from "@/lib/queries/objekte"

export default async function ObjektePage() {
  const objekte = await holeObjekte()
  const trefferPaare = await Promise.all(objekte.map(async (o) => [o.id, await zaehleMatchesFuerObjekt(o.id)] as const))
  const treffer = Object.fromEntries(trefferPaare)

  return (
    <>
      <Header titel="Objekte" untertitel={`${objekte.length} im Bestand`} />
      <main className="flex-1 overflow-y-auto p-5">
        <ObjekteAnsicht objekte={objekte} treffer={treffer} />
      </main>
    </>
  )
}
```

- [ ] **Step 3: Manuell prüfen — das zentrale Abnahmekriterium des Projekts**

Run: `npm run dev`. Vor dem Test im Supabase SQL-Editor eine sehr alte offene Anfrage sicherstellen: `update anfragen set letzter_kontakt = now() - interval '96 days' where id = '33333333-3333-3333-3333-333333333308';` (die Nordwest-Metallbau-Anfrage aus dem Seed, 96 Tage still).

Auf `/objekte` „Objekt anlegen" klicken, ein Objekt anlegen, das zu dieser 96 Tage alten Anfrage passt (z. B. Titel „Halle Zuchwil Neu", Ort „Zuchwil", Fläche 2500, Nutzung „produktion", Preis 125, Eigentümer „Test").

Expected: Nach dem Anlegen zeigt die Karte „1 Treffer" (oder mehr). Auf `/` (Matches) erscheint eine neue Match-Karte zwischen diesem Objekt und der 96 Tage alten Anfrage — **das ist das zentrale Abnahmekriterium des README**: „Ein neu angelegtes Objekt erzeugt Matches gegen alle offenen Anfragen, auch gegen solche mit über 90 Tagen ohne Kontakt."

- [ ] **Step 4: Commit**

```bash
git add components/objekte/ObjekteAnsicht.tsx "app/(app)/objekte"
git commit -m "feat: Objekte-Seite zusammensetzen"
```

---

### Task 59: Meilenstein M7 abschliessen

- [ ] **Step 1: Vollständigen Check laufen lassen**

Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`

- [ ] **Step 2: Pull Request öffnen, CI abwarten, mergen**

```bash
git push -u origin feature/m7-objekte
gh pr create --title "M7: Objekte und bidirektionales Rematching" --base main
gh pr merge --squash
git checkout main && git pull
```

---

## Meilenstein M8 · Matches-Startseite mit KI-Angebots- und Nachfass-Entwürfen

### Task 60: Query-Funktionen für die Matches-Startseite

`holeNeueMatches` bindet die Firma **nicht** über eine direkte PostgREST-Einbettung `anfragen(firmen(name))` ein — das würde `firmen.name` roh laden und die in M6 gebaute Vertraulichkeits-Regel umgehen (jede vertrauliche Anfrage einer `leser`-Rolle würde den Firmennamen auf der Matches-Karte trotzdem zeigen). Stattdessen wird wie in `holeAnfragen` über `anfragen_sichtbar` aufgelöst.

**Files:**
- Modify: `lib/queries/matches.ts`
- Modify: `lib/queries/anfragen.ts`

**Interfaces:**
- Produces: `NeuerMatch` (Typ), `holeNeueMatches()`, `holeOffenePulsWerte()`.

- [ ] **Step 1: `lib/queries/matches.ts` um `holeNeueMatches` erweitern**

```ts
import type { Kriterium } from "@/types"

export type NeuerMatch = {
  id: string
  score: number
  kriterien: Kriterium[]
  hinweis: string
  objekt: { titel: string; adresse: string; flaeche: number; preis_pro_m2: number | null; foto_url: string | null }
  anfrage: { id: string; flaeche_min: number | null; flaeche_max: number | null; letzter_kontakt: string; vertraulich: boolean }
  firma: { name: string; website: string | null } | null
}

export async function holeNeueMatches(): Promise<NeuerMatch[]> {
  const supabase = await erstelleServerClient()
  const { data: matchRows, error: matchError } = await supabase
    .from("matches")
    .select("*, objekte(titel, adresse, flaeche, preis_pro_m2, foto_url)")
    .eq("status", "neu")
    .order("score", { ascending: false })
  if (matchError) throw matchError

  const [{ data: anfragenData, error: anfragenError }, { data: firmenData, error: firmenError }] = await Promise.all([
    supabase.from("anfragen_sichtbar").select("*"),
    supabase.from("firmen").select("id, name, website"),
  ])
  if (anfragenError) throw anfragenError
  if (firmenError) throw firmenError

  const anfragenNachId = new Map(anfragenData.map((a) => [a.id, a]))
  const firmenNachId = new Map(firmenData.map((f) => [f.id, f]))

  return matchRows.flatMap((m) => {
    const anfrage = anfragenNachId.get(m.anfrage_id)
    if (!anfrage || !m.objekte) return []
    const firma = anfrage.firma_id ? (firmenNachId.get(anfrage.firma_id) ?? null) : null
    return [
      {
        id: m.id,
        score: m.score,
        kriterien: m.kriterien as Kriterium[],
        hinweis: m.hinweis,
        objekt: m.objekte,
        anfrage,
        firma,
      },
    ]
  })
}
```

- [ ] **Step 2: `lib/queries/anfragen.ts` um `holeOffenePulsWerte` erweitern**

Reine Zeitstempel für den Bestandspuls — keine Vertraulichkeitsfrage, da keine Firmendaten enthalten sind.

```ts
export async function holeOffenePulsWerte(): Promise<Date[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").select("letzter_kontakt").eq("status", "offen")
  if (error) throw error
  return data.map((row) => new Date(row.letzter_kontakt))
}
```

- [ ] **Step 3: Typecheck und Commit**

Run: `npx tsc --noEmit`

```bash
git checkout -b feature/m8-matches
git add lib/queries/matches.ts lib/queries/anfragen.ts
git commit -m "feat: Query-Funktionen fuer die Matches-Startseite ohne Vertraulichkeits-Leck"
```

---

### Task 61: Server Action `app/actions/matches.ts` — Angebots- und Nachfass-Entwürfe

**Files:**
- Create: `app/actions/matches.ts`
- Modify: `lib/queries/anfragen.ts` (kleine Ergänzung `holeFirma`)

**Interfaces:**
- Consumes: `entwurfAngebot`, `entwurfNachfass` (M5 Task 38), `sendeWennFreigegeben` (M5 Task 39), `holeAnfrage`/`zuAnfrageDomain` (M6 Task 47), `holeObjekt`/`zuObjektDomain` (M7 Task 54).
- Produces: `matchSenden(matchId)`, `matchVerwerfen(matchId)`, `anfrageNachfragen(anfrageId)` — verwendet von `MatchesAnsicht` (Task 65).

- [ ] **Step 1: `holeFirma` in `lib/queries/anfragen.ts` ergänzen**

Für die Empfängeradresse braucht die Server Action die echte Firmenmail — das ist eine interne Operation, ausgelöst nur von `admin`/`vermittler` (RLS erlaubt `leser` ohnehin kein Schreiben), keine Anzeige an eine eingeschränkte Rolle. Die Vertraulichkeits-Regel aus M6 betrifft nur die *Anzeige*, nicht diesen internen Versandschritt.

```ts
export async function holeFirma(firmaId: string): Promise<{ name: string; kontakt_email: string | null } | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("firmen").select("name, kontakt_email").eq("id", firmaId).maybeSingle()
  if (error) throw error
  return data
}
```

- [ ] **Step 2: `app/actions/matches.ts` anlegen**

```ts
"use server"

import { revalidatePath } from "next/cache"
import { entwurfAngebot, entwurfNachfass } from "@/lib/ki/entwuerfe"
import { legeNachrichtAn } from "@/lib/queries/nachrichten"
import { holeAnfrage, holeFirma, zuAnfrageDomain } from "@/lib/queries/anfragen"
import { holeObjekt, zuObjektDomain } from "@/lib/queries/objekte"
import { erstelleServerClient } from "@/lib/supabase/server"
import { sendeWennFreigegeben } from "./nachrichten"
import type { Kriterium } from "@/types"

async function empfaengerFuerAnfrage(firmaId: string | null): Promise<string> {
  if (!firmaId) return "kontakt@example.ch"
  const firma = await holeFirma(firmaId)
  return firma?.kontakt_email ?? "kontakt@example.ch"
}

export async function matchSenden(matchId: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { data: matchRow, error } = await supabase.from("matches").select("*").eq("id", matchId).single()
  if (error) throw error

  const [anfrageRow, objektRow] = await Promise.all([holeAnfrage(matchRow.anfrage_id), holeObjekt(matchRow.objekt_id)])
  if (!anfrageRow || !objektRow) throw new Error("Anfrage oder Objekt nicht gefunden")

  const anfrage = zuAnfrageDomain(anfrageRow)
  const objekt = zuObjektDomain(objektRow)
  const entwurf = await entwurfAngebot(anfrage, objekt, matchRow.kriterien as Kriterium[], matchRow.hinweis)
  const empfaenger = await empfaengerFuerAnfrage(anfrageRow.firma_id)

  const nachricht = await legeNachrichtAn({
    richtung: "entwurf",
    typ: "angebot",
    anfrage_id: anfrage.id,
    match_id: matchId,
    von: "kontakt@espaceso.ch",
    an: empfaenger,
    betreff: entwurf.betreff,
    body: entwurf.body,
  })
  // Angebote gehen laut README nur auf Freigabestufe 3 automatisch raus.
  await sendeWennFreigegeben(nachricht, 3)

  const { error: updateError } = await supabase.from("matches").update({ status: "gesendet" }).eq("id", matchId)
  if (updateError) throw updateError

  revalidatePath("/")
  revalidatePath("/postfach")
}

export async function matchVerwerfen(matchId: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("matches").update({ status: "verworfen" }).eq("id", matchId)
  if (error) throw error
  revalidatePath("/")
}

export async function anfrageNachfragen(anfrageId: string): Promise<void> {
  const anfrageRow = await holeAnfrage(anfrageId)
  if (!anfrageRow) throw new Error("Anfrage nicht gefunden")

  const anfrage = zuAnfrageDomain(anfrageRow)
  const tage = Math.floor((Date.now() - anfrage.letzterKontakt.getTime()) / 86_400_000)
  const entwurf = await entwurfNachfass(anfrage, tage)
  const empfaenger = await empfaengerFuerAnfrage(anfrageRow.firma_id)

  const nachricht = await legeNachrichtAn({
    richtung: "entwurf",
    typ: "nachfass",
    anfrage_id: anfrage.id,
    von: "kontakt@espaceso.ch",
    an: empfaenger,
    betreff: entwurf.betreff,
    body: entwurf.body,
  })
  // Spec-Annahme A2: Nachfass wie Rückfrage, automatischer Versand ab Stufe 2.
  await sendeWennFreigegeben(nachricht, 2)

  revalidatePath("/")
  revalidatePath("/postfach")
}
```

- [ ] **Step 3: Typecheck und Commit**

Run: `npx tsc --noEmit`

```bash
git add app/actions/matches.ts lib/queries/anfragen.ts
git commit -m "feat: matchSenden, matchVerwerfen, anfrageNachfragen mit KI-Entwuerfen"
```

---

### Task 62: `PulsHero`

**Files:**
- Create: `components/matches/PulsHero.tsx`

**Interfaces:**
- Consumes: `puls`, `pulsFarbe` (M2 Task 16).
- Produces: `<PulsHero letzteKontakte />` — reine Anzeige, Server Component.

- [ ] **Step 1: `components/matches/PulsHero.tsx` anlegen**

EKG-Pfad-Berechnung 1:1 aus `docs/puls-cockpit-v5.html:522-535` übernommen.

```tsx
import { puls, pulsFarbe } from "@/lib/puls"

function ekgPfad(w: number, h: number, wert: number, beats: number): string {
  const mid = h / 2
  const amp = Math.max(2, (wert / 100) * (h * 0.4))
  const seg = w / beats
  let d = `M0 ${mid}`
  for (let i = 0; i < beats; i++) {
    const x = i * seg
    d += ` L${(x + seg * 0.3).toFixed(1)} ${mid}`
    d += ` L${(x + seg * 0.36).toFixed(1)} ${(mid + amp * 0.22).toFixed(1)}`
    d += ` L${(x + seg * 0.44).toFixed(1)} ${(mid - amp).toFixed(1)}`
    d += ` L${(x + seg * 0.52).toFixed(1)} ${(mid + amp * 0.55).toFixed(1)}`
    d += ` L${(x + seg * 0.6).toFixed(1)} ${mid}`
    d += ` L${(x + seg).toFixed(1)} ${mid}`
  }
  return d
}

const FARBE_VAR: Record<ReturnType<typeof pulsFarbe>, string> = {
  gut: "var(--good)", warn: "var(--warn)", kritisch: "var(--crit)",
}

export function PulsHero({ letzteKontakte }: { letzteKontakte: Date[] }) {
  const werte = letzteKontakte.map((d) => puls(d))
  const durchschnitt = werte.length ? Math.round(werte.reduce((s, v) => s + v, 0) / werte.length) : 0
  const frisch = werte.filter((w) => w >= 60).length
  const altert = werte.filter((w) => w >= 25 && w < 60).length
  const kritisch = werte.filter((w) => w < 25).length
  const farbe = FARBE_VAR[pulsFarbe(durchschnitt)]
  const W = 1000
  const H = 72
  const pfad = ekgPfad(W, H, durchschnitt, 9)

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface p-4">
      <div className="flex flex-wrap items-end gap-5">
        <div>
          <div className="font-display text-4xl font-bold" style={{ color: farbe }}>
            {durchschnitt}
          </div>
          <div className="mt-0.5 text-xs text-ink-3">Bestandspuls</div>
        </div>
        <div className="ml-auto flex gap-4">
          <div><b className="block font-display text-lg text-good">{frisch}</b><span className="text-xs text-ink-3">frisch</span></div>
          <div><b className="block font-display text-lg text-warn">{altert}</b><span className="text-xs text-ink-3">altert</span></div>
          <div><b className="block font-display text-lg text-crit">{kritisch}</b><span className="text-xs text-ink-3">kritisch</span></div>
        </div>
      </div>
      <div className="-mx-4 mt-2.5 h-[72px]">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[72px] w-full" aria-hidden="true">
          <path d={`M0 ${H / 2} L${W} ${H / 2}`} stroke="var(--line)" strokeWidth="1" fill="none" />
          <path d={pfad} fill="none" stroke={farbe} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={0.26} />
          <path
            d={pfad} fill="none" stroke={farbe} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="150 3000" strokeDashoffset="150"
          >
            <animate attributeName="stroke-dashoffset" from="150" to="-3000" dur="7s" repeatCount="indefinite" />
          </path>
        </svg>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck und Commit**

```bash
git add components/matches/PulsHero.tsx
git commit -m "feat: PulsHero mit EKG-Linie"
```

---

### Task 63: `MatchCard`

**Files:**
- Create: `components/matches/MatchCard.tsx`

**Interfaces:**
- Consumes: `NeuerMatch` (Task 60).
- Produces: `<MatchCard match onOeffnen onSenden onVerwerfen />`.

- [ ] **Step 1: `components/matches/MatchCard.tsx` anlegen**

```tsx
import type { NeuerMatch } from "@/lib/queries/matches"

function mapsLink(adresse: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`
}
function webLink(name: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(name)}`
}

const STATUS_ZEICHEN: Record<string, string> = { ok: "✓", teilweise: "~", nein: "✕" }
const STATUS_FARBE: Record<string, string> = { ok: "text-good", teilweise: "text-warn", nein: "text-crit" }

export function MatchCard({
  match, onOeffnen, onSenden, onVerwerfen,
}: {
  match: NeuerMatch
  onOeffnen: () => void
  onSenden: () => void
  onVerwerfen: () => void
}) {
  return (
    <article onClick={onOeffnen} className="cursor-pointer overflow-hidden rounded-card border border-line bg-surface hover:border-line-2">
      <div className="grid grid-cols-[118px_minmax(0,1fr)_34px_minmax(0,1fr)_auto] items-center gap-3.5 p-3">
        <div className="h-20 w-[118px] overflow-hidden rounded-lg bg-surface-3">
          {match.objekt.foto_url && (
            // eslint-disable-next-line @next/next/no-img-element -- freie Foto-URL ohne Upload, siehe README
            <img src={match.objekt.foto_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div>
          <div className="text-sm font-semibold text-ink">{match.objekt.titel}</div>
          <div className="mt-0.5 text-xs text-ink-2">
            {match.objekt.flaeche} m² · {match.objekt.preis_pro_m2 !== null ? `CHF ${match.objekt.preis_pro_m2}/m²` : "auf Anfrage"}
          </div>
          <a
            href={mapsLink(match.objekt.adresse)} target="_blank" rel="noopener"
            onClick={(e) => e.stopPropagation()} className="mt-0.5 block text-xs text-brand hover:underline"
          >
            Karte ↗
          </a>
        </div>
        <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-brand-soft text-brand">↔</span>
        <div>
          <div className="text-sm font-semibold text-ink">
            {match.firma?.name ?? (match.anfrage.vertraulich ? "vertraulich" : "?")}
          </div>
          <div className="mt-0.5 text-xs text-ink-2">
            sucht {match.anfrage.flaeche_min ?? "?"}–{match.anfrage.flaeche_max ?? "?"} m²
          </div>
          {match.firma && (
            <a
              href={webLink(match.firma.name)} target="_blank" rel="noopener"
              onClick={(e) => e.stopPropagation()} className="mt-0.5 block text-xs text-brand hover:underline"
            >
              Website ↗
            </a>
          )}
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-bold text-good">{match.score}%</div>
          <div className="text-xs text-ink-3">Treffer</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-3.5 py-2.5">
        <span className="mr-auto flex flex-wrap gap-1.5">
          {match.kriterien.map((k) => (
            <span
              key={k.kriterium}
              className={`rounded-full border border-line bg-surface px-2 py-0.5 text-[11.5px] ${STATUS_FARBE[k.status]}`}
            >
              {k.kriterium} {STATUS_ZEICHEN[k.status]}
            </span>
          ))}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onSenden() }}
          className="rounded-lg bg-brand px-2.5 py-1 text-xs font-medium text-on-brand hover:bg-brand-2"
        >
          Angebot senden
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onVerwerfen() }}
          className="rounded-lg border border-line-2 px-2.5 py-1 text-xs text-ink hover:bg-surface"
        >
          Verwerfen
        </button>
      </div>
    </article>
  )
}
```

- [ ] **Step 2: Typecheck und Commit**

```bash
git add components/matches/MatchCard.tsx
git commit -m "feat: MatchCard"
```

---

### Task 64: `MatchDetail`

**Files:**
- Create: `components/matches/MatchDetail.tsx`

**Interfaces:**
- Consumes: `Drawer` (M4 Task 33), `NeuerMatch` (Task 60).
- Produces: `<MatchDetail match offen onSchliessen onSenden onVerwerfen />`.

- [ ] **Step 1: `components/matches/MatchDetail.tsx` anlegen**

```tsx
import { Drawer } from "@/components/layout/Drawer"
import type { NeuerMatch } from "@/lib/queries/matches"

const STATUS_ZEICHEN: Record<string, string> = { ok: "✓", teilweise: "~", nein: "✕" }
const STATUS_FARBE: Record<string, string> = { ok: "text-good", teilweise: "text-warn", nein: "text-crit" }

export function MatchDetail({
  match, offen, onSchliessen, onSenden, onVerwerfen,
}: {
  match: NeuerMatch | null
  offen: boolean
  onSchliessen: () => void
  onSenden: () => void
  onVerwerfen: () => void
}) {
  if (!match) return null

  return (
    <Drawer
      offen={offen}
      onSchliessen={onSchliessen}
      titel={`${match.score}% Treffer`}
      untertitel={`${match.objekt.titel} ↔ ${match.firma?.name ?? "vertraulich"}`}
    >
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th></th>
            <th className="pb-1.5 text-left font-medium text-ink-3">Gesucht</th>
            <th className="pb-1.5 text-left font-medium text-ink-3">Objekt</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {match.kriterien.map((k) => (
            <tr key={k.kriterium} className="border-b border-line last:border-b-0">
              <td className="py-2 pr-2 text-ink-3">{k.kriterium}</td>
              <td className="py-2 pr-2">{k.gesucht}</td>
              <td className="py-2 pr-2">{k.angeboten}</td>
              <td className={`py-2 text-right font-bold ${STATUS_FARBE[k.status]}`}>{STATUS_ZEICHEN[k.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-ink-2">{match.hinweis}</p>
      <div className="flex gap-2">
        <button onClick={onSenden} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-on-brand">
          Angebot senden
        </button>
        <button onClick={onVerwerfen} className="rounded-lg border border-line-2 px-3 py-1.5 text-sm text-ink">
          Verwerfen
        </button>
      </div>
    </Drawer>
  )
}
```

- [ ] **Step 2: Typecheck und Commit**

```bash
git add components/matches/MatchDetail.tsx
git commit -m "feat: MatchDetail mit Vergleichstabelle"
```

---

### Task 65: Matches-Startseite zusammensetzen

**Files:**
- Create: `components/matches/MatchesAnsicht.tsx`
- Modify: `app/(app)/page.tsx` (Platzhalter aus M4 Task 34 ersetzen)

**Interfaces:**
- Consumes: `PulsHero` (Task 62), `MatchCard` (Task 63), `MatchDetail` (Task 64), `matchSenden`/`matchVerwerfen`/`anfrageNachfragen` (Task 61), `holeNeueMatches`/`holeOffenePulsWerte` (Task 60), `holeAnfragen` (M6 Task 47), `holeObjekte` (M7 Task 54).
- Produces: die vollständige Route `/`.

- [ ] **Step 1: `components/matches/MatchesAnsicht.tsx` anlegen**

```tsx
"use client"

import { useState } from "react"
import { PulsHero } from "./PulsHero"
import { MatchCard } from "./MatchCard"
import { MatchDetail } from "./MatchDetail"
import { matchSenden, matchVerwerfen, anfrageNachfragen } from "@/app/actions/matches"
import { puls } from "@/lib/puls"
import type { NeuerMatch } from "@/lib/queries/matches"
import type { AnfrageMitFirma } from "@/lib/queries/anfragen"

export function MatchesAnsicht({
  matches, letzteKontakte, offeneAnzahl, objektAnzahl, langeStillAnfragen,
}: {
  matches: NeuerMatch[]
  letzteKontakte: Date[]
  offeneAnzahl: number
  objektAnzahl: number
  langeStillAnfragen: AnfrageMitFirma[]
}) {
  const [ausgewaehlteId, setAusgewaehlteId] = useState<string | null>(null)
  const ausgewaehlt = matches.find((m) => m.id === ausgewaehlteId) ?? null
  const langeStillAnzahl = letzteKontakte.filter((d) => puls(d) < 25).length

  async function senden(id: string) {
    setAusgewaehlteId(null)
    await matchSenden(id)
  }
  async function verwerfen(id: string) {
    setAusgewaehlteId(null)
    await matchVerwerfen(id)
  }

  return (
    <>
      <PulsHero letzteKontakte={letzteKontakte} />

      <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <div className="rounded-card border-y border-r border-l-[3px] border-line border-l-brand bg-surface p-3.5">
          <div className="text-xs text-ink-3">Neue Matches</div>
          <div className="font-display text-2xl font-bold text-ink">{matches.length}</div>
        </div>
        <div className="rounded-card border border-line bg-surface p-3.5">
          <div className="text-xs text-ink-3">Offene Anfragen</div>
          <div className="font-display text-2xl font-bold text-ink">{offeneAnzahl}</div>
        </div>
        <div className="rounded-card border border-line bg-surface p-3.5">
          <div className="text-xs text-ink-3">Objekte</div>
          <div className="font-display text-2xl font-bold text-ink">{objektAnzahl}</div>
        </div>
        <div className="rounded-card border-y border-r border-l-[3px] border-line border-l-warn bg-surface p-3.5">
          <div className="text-xs text-ink-3">Lange still</div>
          <div className="font-display text-2xl font-bold text-ink">{langeStillAnzahl}</div>
        </div>
      </div>

      <div className="mb-2.5 flex items-baseline gap-2.5">
        <h2 className="font-display text-base font-bold text-ink">Neue Matches</h2>
        <span className="ml-auto text-xs text-ink-3">{matches.length} Vorschläge</span>
      </div>
      <div className="flex flex-col gap-3">
        {matches.length === 0 && (
          <div className="rounded-card border border-line bg-surface p-8 text-center text-sm text-ink-3">
            Keine offenen Matches.
          </div>
        )}
        {matches.map((m) => (
          <MatchCard
            key={m.id} match={m}
            onOeffnen={() => setAusgewaehlteId(m.id)}
            onSenden={() => void senden(m.id)}
            onVerwerfen={() => void verwerfen(m.id)}
          />
        ))}
      </div>

      <div className="mt-4 rounded-card border border-line bg-surface">
        <div className="flex items-center gap-2.5 border-b border-line p-3.5">
          <h2 className="font-display text-base font-bold text-ink">Lange nichts gehört</h2>
          <span className="ml-auto text-xs text-ink-3">{langeStillAnfragen.length} Anfragen</span>
        </div>
        {langeStillAnfragen.map((a) => {
          const tage = Math.floor((Date.now() - new Date(a.letzter_kontakt).getTime()) / 86_400_000)
          return (
            <div key={a.id} className="flex items-center gap-3 border-b border-line p-3 last:border-b-0">
              <span className={`h-2 w-2 rounded-full ${tage > 60 ? "bg-crit" : "bg-warn"}`} />
              <div>
                <div className="text-sm font-medium text-ink">
                  {a.firma?.name ?? (a.vertraulich ? "vertraulich" : "?")}
                </div>
                <div className="text-xs text-ink-3">
                  {a.flaeche_min ?? "?"}–{a.flaeche_max ?? "?"} m² · {a.ort ?? "?"}
                </div>
              </div>
              <span className="ml-auto text-xs text-ink-2">{tage} Tage</span>
              <button
                onClick={() => void anfrageNachfragen(a.id)}
                className="rounded-lg border border-line-2 px-2.5 py-1 text-xs text-ink hover:bg-surface-2"
              >
                Nachfragen
              </button>
            </div>
          )
        })}
      </div>

      <MatchDetail
        match={ausgewaehlt}
        offen={!!ausgewaehlt}
        onSchliessen={() => setAusgewaehlteId(null)}
        onSenden={() => ausgewaehlt && senden(ausgewaehlt.id)}
        onVerwerfen={() => ausgewaehlt && verwerfen(ausgewaehlt.id)}
      />
    </>
  )
}
```

- [ ] **Step 2: `app/(app)/page.tsx` ersetzen**

```tsx
import { Header } from "@/components/layout/Header"
import { MatchesAnsicht } from "@/components/matches/MatchesAnsicht"
import { holeNeueMatches, type NeuerMatch } from "@/lib/queries/matches"
import { holeOffenePulsWerte, holeAnfragen } from "@/lib/queries/anfragen"
import { holeObjekte } from "@/lib/queries/objekte"
import { formatDatum } from "@/lib/format"

export default async function MatchesPage() {
  const [matches, letzteKontakte, anfragen, objekte] = await Promise.all([
    holeNeueMatches(),
    holeOffenePulsWerte(),
    holeAnfragen(),
    holeObjekte(),
  ])
  const langeStillAnfragen = anfragen.filter((a) => a.status === "offen").slice(0, 3)

  return (
    <>
      <Header titel="Matches" untertitel={formatDatum(new Date())} />
      <main className="flex-1 overflow-y-auto p-5">
        <MatchesAnsicht
          matches={matches satisfies NeuerMatch[]}
          letzteKontakte={letzteKontakte}
          offeneAnzahl={letzteKontakte.length}
          objektAnzahl={objekte.length}
          langeStillAnfragen={langeStillAnfragen}
        />
      </main>
    </>
  )
}
```

- [ ] **Step 3: Manuell end-to-end prüfen**

Run: `npm run dev`, `/` öffnen.
Expected: EKG-Hero mit Durchschnittspuls, vier Kennzahlkacheln, Match-Karten aus den in M7 erzeugten Matches, „Lange nichts gehört" mit den drei am längsten stillen offenen Anfragen.

Auf „Angebot senden" einer Karte klicken.
Expected: Die Karte verschwindet aus „Neue Matches" (Status jetzt `gesendet`); im Postfach (`/postfach`) erscheint ein neuer, von der KI formulierter Angebots-Entwurf, der das Objekt nennt und auf den Hinweis aus der Kriterien-Tabelle eingeht; auf Freigabestufe 1 ist er **nicht** automatisch gesendet.

Auf „Nachfragen" bei einer Anfrage unter „Lange nichts gehört" klicken.
Expected: Ein Nachfass-Entwurf erscheint im Postfach, der nach der Aktualität der Suche fragt.

- [ ] **Step 4: Commit**

```bash
git add components/matches/MatchesAnsicht.tsx "app/(app)/page.tsx"
git commit -m "feat: Matches-Startseite mit KI-Angebots- und Nachfass-Entwuerfen"
```

---

### Task 66: Meilenstein M8 abschliessen

- [ ] **Step 1: Alle acht README-Abnahmekriterien einmal durchgehen**

1. Anfrage ohne Budget/Bezug speicherbar, Lücken als `?` (M6) ✓
2. Neues Objekt erzeugt Matches gegen alle offenen Anfragen, auch über 90 Tage still (M7) ✓
3. Jeder Match zeigt Kriterium für Kriterium (M8, `MatchDetail`) ✓
4. Vertrauliche Anfrage zeigt `leser` weder Firmenname noch Budget (M1 View, M6/M8 Query-Schicht) ✓
5. Freigabestufe 1: keine Nachricht ohne Klick, serverseitig geprüft (M5/M8 Server Actions) ✓
6. Bestandspuls ändert sich nachvollziehbar bei aktualisiertem `letzter_kontakt` (M2/M8) ✓
7. `lib/matching.ts` und `lib/puls.ts` durch Tests abgedeckt (M2) ✓
8. Keine Komponente über 200 Zeilen, kein `any` (laufend geprüft)

- [ ] **Step 2: Vollständigen Check laufen lassen**

Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`

- [ ] **Step 3: Pull Request öffnen, CI abwarten, mergen**

```bash
git push -u origin feature/m8-matches
gh pr create --title "M8: Matches-Startseite mit KI-Entwuerfen - Kernkette vollstaendig" --base main
gh pr merge --squash
git checkout main && git pull
```

Damit ist die in der Spec (D6) priorisierte Kernkette **Anfrage → Objekt → Match inklusive KI-Mailerkennung und KI-Entwürfen** vollständig und auf Vercel live.

---

## Meilenstein M9 · Regeln

### Task 67: Query, Server Action und Seite

**Files:**
- Modify: `lib/queries/regeln.ts`
- Create: `app/actions/regeln.ts`
- Create: `components/regeln/RegelnListe.tsx`
- Create: `app/(app)/regeln/page.tsx`

**Interfaces:**
- Consumes: `legeRegelAn`, `naechsterRegelCode` (M5 Task 36, unverändert).
- Produces: `holeRegeln()`, `setzeRegelAktiv(id, aktiv)`, `regelUmschalten(id, aktiv)`.

- [ ] **Step 1: `lib/queries/regeln.ts` um Lesen und Umschalten erweitern**

```ts
import type { Database } from "@/types/database"

export type RegelRow = Database["public"]["Tables"]["regeln"]["Row"]

export async function holeRegeln(): Promise<RegelRow[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("regeln").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function setzeRegelAktiv(id: string, aktiv: boolean): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("regeln").update({ aktiv }).eq("id", id)
  if (error) throw error
}
```

(`legeRegelAn` und `naechsterRegelCode` aus M5 Task 36 bleiben unverändert in derselben Datei stehen.)

- [ ] **Step 2: `app/actions/regeln.ts` anlegen**

```ts
"use server"

import { revalidatePath } from "next/cache"
import { setzeRegelAktiv } from "@/lib/queries/regeln"

export async function regelUmschalten(id: string, aktiv: boolean): Promise<void> {
  await setzeRegelAktiv(id, aktiv)
  revalidatePath("/regeln")
}
```

- [ ] **Step 3: `components/regeln/RegelnListe.tsx` anlegen**

```tsx
"use client"

import { regelUmschalten } from "@/app/actions/regeln"
import type { RegelRow } from "@/lib/queries/regeln"

export function RegelnListe({ regeln }: { regeln: RegelRow[] }) {
  return (
    <div className="rounded-card border border-line bg-surface">
      {regeln.map((r) => (
        <div
          key={r.id}
          className="grid grid-cols-[52px_minmax(0,1fr)_auto_auto] items-baseline gap-3 border-b border-line p-3.5 last:border-b-0"
        >
          <span className="text-xs font-semibold text-brand">{r.code}</span>
          <span className={`text-sm ${r.aktiv ? "text-ink" : "text-ink-3 line-through"}`}>{r.beschreibung}</span>
          <span className="text-xs text-ink-3">{r.angewendet_count}×</span>
          <button
            onClick={() => void regelUmschalten(r.id, !r.aktiv)}
            className="rounded-lg border border-line-2 px-2 py-1 text-xs text-ink hover:bg-surface-2"
          >
            {r.aktiv ? "Deaktivieren" : "Aktivieren"}
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: `app/(app)/regeln/page.tsx` anlegen**

```tsx
import { Header } from "@/components/layout/Header"
import { RegelnListe } from "@/components/regeln/RegelnListe"
import { holeRegeln } from "@/lib/queries/regeln"

export default async function RegelnPage() {
  const regeln = await holeRegeln()

  return (
    <>
      <Header titel="Regeln" untertitel="gelernt aus Entscheiden" />
      <main className="flex-1 overflow-y-auto p-5">
        <RegelnListe regeln={regeln} />
      </main>
    </>
  )
}
```

- [ ] **Step 5: Manuell prüfen**

Run: `npm run dev`, auf `/regeln` öffnen.
Expected: Die sechs Seed-Regeln erscheinen. Im Postfach einen Entwurf mit einem Verwerfen-Grund verwerfen (M5) — Expected: Eine siebte Regel mit dem gewählten Grund als Beschreibung erscheint hier.

- [ ] **Step 6: Commit**

```bash
git checkout -b feature/m9-regeln
git add lib/queries/regeln.ts app/actions/regeln.ts components/regeln "app/(app)/regeln"
git commit -m "feat: Regeln-Ansicht mit Deaktivieren"
```

---

### Task 68: Meilenstein M9 abschliessen

- [ ] **Step 1: Vollständigen Check laufen lassen**

Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`

- [ ] **Step 2: Pull Request öffnen, CI abwarten, mergen**

```bash
git push -u origin feature/m9-regeln
gh pr create --title "M9: Regeln" --base main
gh pr merge --squash
git checkout main && git pull
```

---

## Meilenstein M10 · Zahlen

**Spec-Annahme A3:** Das README benennt vier Kennzahlkacheln, legt aber — anders als bei Puls und Matching — keine Berechnungsformel fest. Zwei Kennzahlen lassen sich aus dem vorhandenen Schema ableiten (Erfolgsquote, Bis Erstangebot); zwei würden eine eigene Ereignis-Historie voraussetzen, die nirgends spezifiziert ist (Nacharbeit/Tag, Freigabequote als Zeitmessung). Für diese beiden bleibt der aus dem Prototyp übernommene Beispielwert stehen, mit Kommentar im Code — eine Historie einzuführen wäre eine eigene, hier nicht beauftragte Erweiterung (YAGNI).

### Task 69: Kennzahlen und Diagramm-Daten berechnen

**Files:**
- Create: `lib/queries/zahlen.ts`

**Interfaces:**
- Produces: `holeZahlenKennzahlen()`, `holeErfolgsquoteVerlauf()`, `holeFlaechenVerteilung()`.

- [ ] **Step 1: `lib/queries/zahlen.ts` anlegen**

```ts
import { erstelleServerClient } from "@/lib/supabase/server"

export type ZahlenKennzahlen = {
  bisErstangebotTage: number | null
  erfolgsquoteProzent: number
  nacharbeitProTagMinuten: number
  freigabequoteProzent: number
}

export async function holeZahlenKennzahlen(): Promise<ZahlenKennzahlen> {
  const supabase = await erstelleServerClient()

  const { data: anfragenData, error: anfragenError } = await supabase.from("anfragen").select("status")
  if (anfragenError) throw anfragenError
  const gesamt = anfragenData.length
  const vermittelt = anfragenData.filter((a) => a.status === "vermittelt").length
  const erfolgsquoteProzent = gesamt > 0 ? Math.round((vermittelt / gesamt) * 100) : 0

  const { data: angeboteData, error: angeboteError } = await supabase
    .from("nachrichten")
    .select("created_at, anfragen(created_at)")
    .eq("typ", "angebot")
  if (angeboteError) throw angeboteError
  const tageBisAngebot = angeboteData
    .map((n) => {
      if (!n.anfragen) return null
      const differenz = new Date(n.created_at).getTime() - new Date(n.anfragen.created_at).getTime()
      return differenz / 86_400_000
    })
    .filter((wert): wert is number => wert !== null && wert >= 0)
  const bisErstangebotTage =
    tageBisAngebot.length > 0
      ? Math.round((tageBisAngebot.reduce((s, v) => s + v, 0) / tageBisAngebot.length) * 10) / 10
      : null

  return {
    bisErstangebotTage,
    erfolgsquoteProzent,
    // Würde eine Zeiterfassung der manuellen Nacharbeit voraussetzen, die nirgends
    // spezifiziert ist (Spec-Annahme A3) — aus dem Prototyp übernommener Beispielwert.
    nacharbeitProTagMinuten: 11,
    // Würde eine Historie aller Freigabe-Entscheidungen voraussetzen (Spec-Annahme A3).
    freigabequoteProzent: 91,
  }
}

export async function holeErfolgsquoteVerlauf(): Promise<{ monat: string; prozent: number }[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").select("status, created_at")
  if (error) throw error

  const nachMonat = new Map<string, { gesamt: number; vermittelt: number }>()
  for (const a of data) {
    const monat = new Date(a.created_at).toISOString().slice(0, 7)
    const eintrag = nachMonat.get(monat) ?? { gesamt: 0, vermittelt: 0 }
    eintrag.gesamt += 1
    if (a.status === "vermittelt") eintrag.vermittelt += 1
    nachMonat.set(monat, eintrag)
  }

  return [...nachMonat.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monat, { gesamt, vermittelt }]) => ({
      monat,
      prozent: gesamt > 0 ? Math.round((vermittelt / gesamt) * 100) : 0,
    }))
}

export async function holeFlaechenVerteilung(): Promise<{ bereich: string; anzahl: number }[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").select("flaeche_min, flaeche_max").eq("status", "offen")
  if (error) throw error

  const BEREICHE: [string, number, number][] = [
    ["bis 300 m²", 0, 300],
    ["300–800 m²", 300, 800],
    ["800–1'500 m²", 800, 1500],
    ["1'500–2'500 m²", 1500, 2500],
    ["über 2'500 m²", 2500, Infinity],
  ]

  return BEREICHE.map(([bereich, min, max]) => ({
    bereich,
    anzahl: data.filter((a) => {
      const referenz = a.flaeche_max ?? a.flaeche_min
      return referenz !== null && referenz > min && referenz <= max
    }).length,
  }))
}
```

- [ ] **Step 2: Typecheck und Commit**

Run: `npx tsc --noEmit`

```bash
git checkout -b feature/m10-zahlen
git add lib/queries/zahlen.ts
git commit -m "feat: Zahlen-Kennzahlen aus vorhandenen Daten ableiten (Spec-Annahme A3)"
```

---

### Task 70: Zahlen-Seite mit handgeschriebenen SVG-Diagrammen

Keine Diagrammbibliothek (README-Vorgabe) — Liniendiagramm-Berechnung 1:1 aus `docs/puls-cockpit-v5.html:721-738` übernommen.

**Files:**
- Create: `app/(app)/zahlen/page.tsx`

**Interfaces:**
- Consumes: `holeZahlenKennzahlen`, `holeErfolgsquoteVerlauf`, `holeFlaechenVerteilung` (Task 69).
- Produces: die Route `/zahlen`.

- [ ] **Step 1: `app/(app)/zahlen/page.tsx` anlegen**

```tsx
import { Header } from "@/components/layout/Header"
import { holeZahlenKennzahlen, holeErfolgsquoteVerlauf, holeFlaechenVerteilung } from "@/lib/queries/zahlen"

function liniendiagramm(daten: { monat: string; prozent: number }[]): string {
  if (daten.length === 0) return ""
  const W = 480, H = 180, L = 32, R = 12, T = 12, B = 26
  const iw = W - L - R, ih = H - T - B, max = 100
  const x = (i: number) => L + (i / Math.max(1, daten.length - 1)) * iw
  const y = (v: number) => T + ih - (v / max) * ih
  return daten.map((d, i) => `${x(i).toFixed(1)},${y(d.prozent).toFixed(1)}`).join(" ")
}

export default async function ZahlenPage() {
  const [kennzahlen, verlauf, verteilung] = await Promise.all([
    holeZahlenKennzahlen(),
    holeErfolgsquoteVerlauf(),
    holeFlaechenVerteilung(),
  ])
  const punkte = liniendiagramm(verlauf)
  const maxAnzahl = Math.max(1, ...verteilung.map((v) => v.anzahl))

  return (
    <>
      <Header titel="Zahlen" untertitel={new Date().getFullYear().toString()} />
      <main className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          <div className="rounded-card border border-line bg-surface p-3.5">
            <div className="text-xs text-ink-3">Bis Erstangebot</div>
            <div className="font-display text-2xl font-bold text-ink">
              {kennzahlen.bisErstangebotTage ?? "?"} <span className="text-sm text-ink-3">Tage</span>
            </div>
          </div>
          <div className="rounded-card border border-line bg-surface p-3.5">
            <div className="text-xs text-ink-3">Erfolgsquote</div>
            <div className="font-display text-2xl font-bold text-ink">{kennzahlen.erfolgsquoteProzent} <span className="text-sm text-ink-3">%</span></div>
          </div>
          <div className="rounded-card border border-line bg-surface p-3.5">
            <div className="text-xs text-ink-3">Nacharbeit / Tag</div>
            <div className="font-display text-2xl font-bold text-ink">{kennzahlen.nacharbeitProTagMinuten} <span className="text-sm text-ink-3">Min.</span></div>
          </div>
          <div className="rounded-card border border-line bg-surface p-3.5">
            <div className="text-xs text-ink-3">Freigabequote</div>
            <div className="font-display text-2xl font-bold text-ink">{kennzahlen.freigabequoteProzent} <span className="text-sm text-ink-3">%</span></div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5">
          <div className="rounded-card border border-line bg-surface p-3.5">
            <h2 className="mb-2 font-display text-sm font-bold text-ink">Erfolgsquote</h2>
            <svg viewBox="0 0 480 180" className="h-auto w-full" role="img" aria-label="Erfolgsquote über die Monate">
              <polyline points={punkte} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="rounded-card border border-line bg-surface p-3.5">
            <h2 className="mb-2 font-display text-sm font-bold text-ink">Gesuchte Grössen</h2>
            {verteilung.map((v) => (
              <div key={v.bereich} className="grid grid-cols-[92px_1fr_28px] items-center gap-2.5 py-1 text-xs">
                <span className="text-right text-ink-2">{v.bereich}</span>
                <span className="h-3.5 overflow-hidden rounded-r bg-surface-2">
                  <span className="block h-full rounded-r bg-brand" style={{ width: `${(v.anzahl / maxAnzahl) * 100}%` }} />
                </span>
                <span className="text-ink-2">{v.anzahl}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
```

- [ ] **Step 2: Manuell prüfen**

Run: `npm run dev`, auf `/zahlen` öffnen.
Expected: Vier Kacheln, ein Liniendiagramm (anfangs evtl. ein einzelner Punkt, da die Seed-Daten alle im selben Monat liegen — wächst mit echten Daten über die Zeit), ein Balkendiagramm der offenen Anfragen nach Flächengrösse.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/zahlen"
git commit -m "feat: Zahlen-Seite mit handgeschriebenen SVG-Diagrammen"
```

---

### Task 71: Meilenstein M10 abschliessen — Projekt vollständig

- [ ] **Step 1: Vollständigen Check laufen lassen**

Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`

- [ ] **Step 2: Alle acht README-Ansichten ein letztes Mal durchklicken**

Matches, Postfach, Anfragen, Objekte, Regeln, Zahlen — jede Seite lädt ohne Fehler, Dunkelmodus funktioniert auf allen sechs.

- [ ] **Step 3: Pull Request öffnen, CI abwarten, mergen**

```bash
git push -u origin feature/m10-zahlen
gh pr create --title "M10: Zahlen - Projekt vollstaendig" --base main
gh pr merge --squash
git checkout main && git pull
```

- [ ] **Step 4: Finalen Produktions-Deploy auf Vercel bestätigen**

Die Vercel-Production-URL öffnen (Spec: „durchgehend erreichbar").
Expected: Alle sechs Ansichten aus dem README sind live, mit den echten Solothurner Seed-Daten aus M1 und den seither angelegten Test-Einträgen.

---
