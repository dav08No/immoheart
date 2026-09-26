# Relaunch N1 · Fundament — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tailwind v4 + shadcn/ui als Basis, Admin-Bereich nach `/admin` verschoben, öffentliches Grundgerüst unter `/`, neues Konto-Modell (kein leser, keine Freigabestufen, keine Regeln, kein Register) — ohne dass eine bestehende Admin-Funktion verloren geht.

**Architecture:** Eine Next.js-App. Middleware schützt nur `/admin/*`. Die Datenbank-Umstellung läuft in zwei Migrationen, weil Preview und Production dieselbe Datenbank nutzen: **A (ergänzend)** wird vor dem Preview-Test eingespielt und bricht die alte Production-App nicht; **B (aufräumend)** wird erst eingespielt, wenn der neue Code auf Production läuft.

**Tech Stack:** Next.js 15.5 (App Router), React 19, TypeScript strict, Supabase (`@supabase/ssr`), Tailwind CSS 4.3.3, shadcn 4.21.0, lucide-react 1.48.0, Vitest 2.

**Spec:** `docs/superpowers/specs/2026-09-26-relaunch-design.md`

**Nachfolgende Pläne:** N2–N7 werden jeweils vor Beginn des Meilensteins als eigene Datei `2026-09-26-relaunch-nX-*.md` geschrieben, auf Basis des dann vorhandenen Codes.

## Global Constraints

- Fachbegriffe deutsch (`Anfrage`, `Objekt`, `Nachricht`, `Konto`), Technisches englisch; kein `any`; Dateien möglichst unter 200 Zeilen.
- Datenzugriff nur in `lib/queries/`, schreibende Operationen als Server Actions in `app/actions/`.
- Server Components als Standard, `"use client"` nur bei Interaktivität.
- Kommentare nur für das *Warum*. Bestehende Kommentare, die nur noch leser/vertraulich/Freigabe erklären, werden entfernt oder gekürzt, nicht fortgeschrieben.
- Neue Pakete mit exakter Version installieren (`npm install --save-exact`), danach `npm audit --omit=dev` — keine `high`/`critical`-Funde.
- `lib/matching.ts`, `lib/puls.ts` und ihre Tests bleiben unverändert.
- Supabase-Projekt `rvxlvrrpltmuzuomdwdf`. Preview und Production teilen die Datenbank.
- Jeder Commit endet mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Arbeitsbranch: `feature/n1-fundament` (von `main`). Kein Merge auf `main` vor bestandenem Live-Test (Task 11).

## Dateiübersicht

| Datei | Aktion | Zweck |
|---|---|---|
| `postcss.config.mjs` | neu (ersetzt `.js`) | Tailwind-v4-PostCSS-Plugin |
| `tailwind.config.ts` | löschen | Konfiguration wandert in CSS |
| `app/globals.css` | umschreiben | `@import "tailwindcss"`, Tokens, `@theme`, Herz-Farbe, shadcn-Variablen |
| `components.json` | neu | shadcn-Konfiguration (UI-Pfad `components/shadcn`) |
| `lib/utils.ts` | neu | `cn()` |
| `components/shadcn/*` | neu (per CLI) | shadcn-Bausteine |
| `components/ui/Button.tsx`, `Card.tsx` | umschreiben | dünne Hüllen um shadcn, API unverändert |
| `app/layout.tsx` | ändern | Fraunces zusätzlich laden |
| `supabase/migrations/20260926100000_konten_a.sql` | neu | Migration A (ergänzend) |
| `supabase/migrations/20260926100100_konten_b.sql` | neu | Migration B (aufräumend) |
| `supabase/seed.sql` | ändern | ohne `regeln`, ohne `vertraulich` |
| `lib/routen.ts`, `lib/routen.test.ts` | neu | reine Pfadlogik für die Middleware |
| `middleware.ts` | umschreiben | nur `/admin` schützen |
| `app/abmelden/route.ts` | neu | Abmelden (GET/POST) |
| `app/(app)/` → `app/admin/` | verschieben | Admin-Bereich |
| `app/(public)/layout.tsx`, `page.tsx` | neu | öffentliches Grundgerüst |
| `components/public/SiteHeader.tsx`, `SiteFooter.tsx`, `HerzLogo.tsx` | neu | öffentlicher Rahmen |
| diverse `lib/queries`, `app/actions`, `components` | ändern | Altlasten entfernen |
| `app/(auth)/register/`, `app/admin/regeln/`, `components/regeln/`, `app/actions/regeln.ts`, `lib/queries/regeln.ts`, `app/actions/profile.ts`, `components/layout/FreigabeSchalter.tsx` | löschen | Altlasten |
| `.github/workflows/keep-alive.yml` | ändern | pingt `objekte_oeffentlich` statt `regeln` |
| `.env.example`, `docs/setup-secrets.md`, `README.md` | ändern | Gmail-Variablen, Verweis auf neue Spec |

---

### Task 1: Branch anlegen und Tailwind auf v4 umstellen

**Files:**
- Create: `postcss.config.mjs`
- Delete: `postcss.config.js`, `tailwind.config.ts`
- Modify: `app/globals.css`, `package.json`, alle `.tsx` mit umbenannten Klassen (durch das Upgrade-Tool)

**Interfaces:**
- Produces: Tailwind-Utilities für alle bestehenden Tokens mit **unveränderten Namen** (`bg-bg`, `bg-surface`, `text-ink-2`, `border-line`, `text-brand`, `bg-brand-soft`, `text-good`, `bg-warn-bg`, `rounded-card`, `font-display`, `font-sans`, …) plus neu `text-heart`, `bg-heart`, `bg-heart-soft`.

- [ ] **Step 1: Branch anlegen**

```bash
git checkout main && git pull --ff-only
git checkout -b feature/n1-fundament
```

- [ ] **Step 2: Upgrade-Tool laufen lassen** (braucht sauberen Arbeitsbaum)

```bash
npx @tailwindcss/upgrade@4.3.3
```

Expected: Das Tool meldet migrierte Dateien, installiert `tailwindcss@4` und `@tailwindcss/postcss`, entfernt `tailwind.config.ts`, schreibt `app/globals.css` auf `@import "tailwindcss"` um und benennt veraltete Klassen in `.tsx`-Dateien um (z. B. `shadow-sm`→`shadow-xs`, `outline-none`→`outline-hidden`, `flex-shrink-0`→`shrink-0`).

- [ ] **Step 3: Versionen exakt pinnen und autoprefixer entfernen**

```bash
npm install --save-dev --save-exact tailwindcss@4.3.3 @tailwindcss/postcss@4.3.3
npm uninstall autoprefixer
```

`postcss.config.mjs` (falls das Tool eine andere Form erzeugt hat, genau so ersetzen; `postcss.config.js` löschen, falls noch vorhanden):

```js
const config = {
  plugins: { "@tailwindcss/postcss": {} },
}

export default config
```

- [ ] **Step 4: `app/globals.css` auf die Zielfassung bringen**

Den vom Tool erzeugten Inhalt vollständig durch diese Fassung ersetzen (Tokens bleiben 1:1, neu sind `--heart`/`--heart-soft`, die shadcn-Variablen und die Fraunces-Variable; der Dunkelmodus hängt weiter an `data-theme="dark"`):

```css
@import "tailwindcss";

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

:root {
  color-scheme: light;
  --bg: #EEF2F5; --surface: #FFFFFF; --surface-2: #F7F9FA; --surface-3: #EAF2F7;
  --ink: #1F2429; --ink-2: #5A6472; --ink-3: #98A2AE;
  --line: #E1E7EC; --line-2: #CFD8E0;
  --brand: #065A82; --brand-2: #1C7293; --on-brand: #FFFFFF; --brand-soft: #EAF2F7;
  --navy: #21295C;
  --good: #0F6E56; --good-bg: #F0F6F3;
  --warn: #A85D14; --warn-bg: #FDF3E3;
  --crit: #9B3232; --crit-bg: #F8EBEB;
  --heart: #E24B5B; --heart-soft: #FCE9EB;

  /* shadcn/ui-Namen, auf die bestehenden Tokens abgebildet */
  --background: var(--bg); --foreground: var(--ink);
  --card: var(--surface); --card-foreground: var(--ink);
  --popover: var(--surface); --popover-foreground: var(--ink);
  --primary: var(--brand); --primary-foreground: var(--on-brand);
  --secondary: var(--surface-3); --secondary-foreground: var(--ink);
  --muted: var(--surface-2); --muted-foreground: var(--ink-2);
  --accent: var(--brand-soft); --accent-foreground: var(--brand);
  --destructive: var(--crit);
  --border: var(--line); --input: var(--line-2); --ring: var(--brand-2);
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #161A33; --surface: #1E2447; --surface-2: #262C55; --surface-3: #2E3560;
  --ink: #EEF2F7; --ink-2: #B8C2D4; --ink-3: #8792AB;
  --line: #333A66; --line-2: #414A7A;
  --brand: #8CBFDC; --brand-2: #A8D2EA; --on-brand: #0E1330; --brand-soft: #29315C;
  --navy: #0E1330;
  --good: #5DCAA5; --good-bg: #1A3B33;
  --warn: #E5B23C; --warn-bg: #3A2E14;
  --crit: #F0908B; --crit-bg: #3D2020;
  --heart: #F27A87; --heart-soft: #3D2027;
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-line: var(--line);
  --color-line-2: var(--line-2);
  --color-brand: var(--brand);
  --color-brand-2: var(--brand-2);
  --color-on-brand: var(--on-brand);
  --color-brand-soft: var(--brand-soft);
  --color-navy: var(--navy);
  --color-good: var(--good);
  --color-good-bg: var(--good-bg);
  --color-warn: var(--warn);
  --color-warn-bg: var(--warn-bg);
  --color-crit: var(--crit);
  --color-crit-bg: var(--crit-bg);
  --color-heart: var(--heart);
  --color-heart-soft: var(--heart-soft);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --radius-card: 10px;
  --font-sans: var(--font-outfit), "Helvetica Neue", Arial, sans-serif;
  --font-display: var(--font-fraunces), Georgia, serif;
}

@layer base {
  /* Tailwind v4 nimmt currentColor als Standard-Rahmenfarbe; v3 hatte ein helles Grau.
     Ohne diese Zeile würden alle blossen `border`-Klassen plötzlich tintenschwarz. */
  *, ::after, ::before, ::backdrop, ::file-selector-button {
    border-color: var(--line);
  }
  body {
    background: var(--bg);
    color: var(--ink);
  }
}
```

Falls die alte `globals.css` unterhalb von `body { … }` weitere Regeln hatte (z. B. Keyframes der EKG-Animation), diese unverändert ans Ende übernehmen: `git show main:app/globals.css` vergleichen.

- [ ] **Step 5: Build und Tests prüfen**

```bash
npm run lint && npx tsc --noEmit && npm run test && npm run build
```

Expected: alles grün.

- [ ] **Step 6: Sichtprüfung**

`npm run dev`, als bestehendes Konto einloggen, `/`, `/postfach`, `/anfragen`, `/objekte` in hell und dunkel ansehen. Erwartet: Aussehen wie vorher (Rahmen hellgrau, keine schwarzen Ränder, Petrol-Knöpfe). Abweichungen bei einzelnen Klassen jetzt beheben.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "build: Tailwind auf v4 umgestellt, Herz-Farbe und shadcn-Variablen in den Tokens"
```

---

### Task 2: shadcn/ui einrichten, Fraunces laden, bestehende Button/Card darauf umstellen

**Files:**
- Create: `components.json`, `lib/utils.ts`, `components/shadcn/*` (CLI)
- Modify: `components/ui/Button.tsx`, `components/ui/Card.tsx`, `app/layout.tsx`, `package.json`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` in `@/lib/utils`; shadcn-Komponenten unter `@/components/shadcn/<name>` (u. a. `Button` mit `variant`/`size`, `Card`, `Badge`, `Input`, `Label`, `Dialog`, `Sheet`, `DropdownMenu`, `Separator`, `Skeleton`, `Tooltip`, `Toaster` aus `sonner`). `components/ui/Button` behält die Props `variante?: "primaer" | "sekundaer"` und alle Button-HTML-Attribute.

Der UI-Ordner heisst bewusst `components/shadcn` statt `components/ui`: Windows unterscheidet Gross-/Kleinschreibung nicht, `components/ui/button.tsx` (shadcn) und das bestehende `components/ui/Button.tsx` würden kollidieren.

- [ ] **Step 1: `components.json` anlegen**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "ui": "@/components/shadcn",
    "utils": "@/lib/utils",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 2: Hilfsfunktion und Basis-Pakete**

```bash
npm install --save-exact clsx@2.1.1 tailwind-merge@3.7.0 class-variance-authority@0.7.1 lucide-react@1.48.0
npm install --save-dev --save-exact tw-animate-css@1.4.0
```

`lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

In `app/globals.css` direkt unter `@import "tailwindcss";` einfügen:

```css
@import "tw-animate-css";
```

- [ ] **Step 3: Komponenten per CLI holen**

```bash
npx shadcn@4.21.0 add button card badge input label dialog sheet dropdown-menu separator skeleton tooltip sonner --yes
```

Expected: Dateien unter `components/shadcn/`. Danach `git diff app/globals.css` prüfen: Hat die CLI eigene `:root`/`.dark`/`@theme`-Blöcke eingefügt, diese Einfügungen wieder entfernen — die Variablen existieren bereits aus Task 1 und die Farben sollen aus unseren Tokens kommen. Fehlende, von der CLI gebrauchte Variablen (z. B. `--sidebar-*`, `--chart-*`) werden in N1 nicht gebraucht.

- [ ] **Step 4: Sicherheitsprüfung der neuen Pakete**

```bash
npm audit --omit=dev
```

Expected: keine `high`/`critical`. Sonst betroffene Version wechseln und erneut prüfen.

- [ ] **Step 5: `components/ui/Button.tsx` als Hülle**

```tsx
import type { ButtonHTMLAttributes } from "react"
import { Button as ShadcnButton } from "@/components/shadcn/button"

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primaer" | "sekundaer" }

export function Button({ variante = "sekundaer", type = "button", ...rest }: Props) {
  return <ShadcnButton type={type} variant={variante === "primaer" ? "default" : "outline"} size="sm" {...rest} />
}
```

`components/ui/Card.tsx`:

```tsx
import { cn } from "@/lib/utils"

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-card border border-line bg-surface", className)}>{children}</div>
}
```

- [ ] **Step 6: Fraunces laden** — `app/layout.tsx` Kopf ersetzen:

```tsx
import type { Metadata } from "next"
import { Fraunces, Outfit } from "next/font/google"
import { cookies } from "next/headers"
import { Toaster } from "@/components/shadcn/sonner"
import "./globals.css"

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" })
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz", "SOFT"] })

export const metadata: Metadata = {
  title: { default: "immoheart", template: "%s · immoheart" },
  description: "Gewerbeflächen in der Region Solothurn, persönlich vermittelt.",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const theme = cookieStore.get("immoheart-theme")?.value === "dark" ? "dark" : "light"

  return (
    <html lang="de" data-theme={theme}>
      <body className={`${outfit.variable} ${fraunces.variable} font-sans`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

Die shadcn-`sonner`-Komponente importiert `next-themes`. Falls `components/shadcn/sonner.tsx` `useTheme` aus `next-themes` verwendet, diese Zeilen ersetzen durch eine feste Übergabe `theme="system"` und `next-themes` wieder deinstallieren — das Projekt steuert das Thema über das Cookie, nicht über `next-themes`.

- [ ] **Step 7: Prüfen**

```bash
npm run lint && npx tsc --noEmit && npm run test && npm run build
```

Expected: grün. Sichtprüfung: Knöpfe in Postfach/Anfragen/Objekte sehen aus wie shadcn-Knöpfe in Petrol (primär) bzw. umrandet (sekundär); Überschriften erscheinen in Fraunces.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: shadcn/ui eingerichtet, Fraunces als Titelschrift, Button/Card auf shadcn umgestellt"
```

---

### Task 3: Migration A (ergänzend) schreiben und einspielen

**Files:**
- Create: `supabase/migrations/20260926100000_konten_a.sql`
- Modify: `types/database.ts` (generiert)

**Interfaces:**
- Produces: Spalten `profiles.darf_nutzer_anlegen boolean not null default false`, `profiles.aktiv boolean not null default true`; Funktion `public.ist_aktives_konto() returns boolean`; Policies „aktives konto …“ auf allen internen Tabellen; View `public.objekte_oeffentlich` (Spalten `id, titel, ort, flaeche, preis_pro_m2, nutzung, eigenschaften, verfuegbar_ab, status, created_at`), lesbar für `anon` und `authenticated`.

Diese Migration entfernt **nichts**. Die alte Production-App (liest `anfragen_sichtbar`, `profiles.rolle`, `regeln`) läuft danach unverändert weiter; die neuen Policies wirken zusätzlich (Postgres verknüpft mehrere permissive Policies mit ODER).

- [ ] **Step 1: Migration schreiben** — `supabase/migrations/20260926100000_konten_a.sql`:

```sql
-- Relaunch N1, Teil A: neues Konto-Modell, rein ergänzend.
-- Teil B (20260926100100_konten_b.sql) entfernt die Altlasten erst, wenn der neue
-- Code auf Production läuft -- Preview und Production teilen diese Datenbank.

alter table profiles
  add column darf_nutzer_anlegen boolean not null default false,
  add column aktiv boolean not null default true;

create function ist_aktives_konto() returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (select 1 from profiles where user_id = auth.uid() and aktiv)
$$;
revoke execute on function ist_aktives_konto() from public, anon;
grant execute on function ist_aktives_konto() to authenticated;

create policy "aktives konto liest profile" on profiles for select to authenticated
  using (ist_aktives_konto());

create policy "aktives konto verwaltet firmen" on firmen for all to authenticated
  using (ist_aktives_konto()) with check (ist_aktives_konto());
create policy "aktives konto verwaltet anfragen" on anfragen for all to authenticated
  using (ist_aktives_konto()) with check (ist_aktives_konto());
create policy "aktives konto verwaltet objekte" on objekte for all to authenticated
  using (ist_aktives_konto()) with check (ist_aktives_konto());
create policy "aktives konto verwaltet matches" on matches for all to authenticated
  using (ist_aktives_konto()) with check (ist_aktives_konto());
create policy "aktives konto verwaltet nachrichten" on nachrichten for all to authenticated
  using (ist_aktives_konto()) with check (ist_aktives_konto());

-- Öffentliche Objektliste. Anonyme Besucher bekommen keine Tabellenrechte auf
-- objekte, sondern nur Spaltenrechte auf die freigegebenen Spalten plus eine
-- Zeilen-Policy. Adresse und Eigentümer sind damit auch per direkter API-Abfrage
-- nicht lesbar. Die View ist security_invoker, damit genau diese Rechte greifen
-- (keine security-definer-View, die RLS umginge).
revoke all on table objekte from anon;
grant select (id, titel, ort, flaeche, preis_pro_m2, nutzung, eigenschaften, verfuegbar_ab, status, created_at)
  on table objekte to anon;
create policy "oeffentlich liest gelistete objekte" on objekte for select to anon
  using (status in ('verfuegbar', 'reserviert'));

create view objekte_oeffentlich with (security_invoker = true) as
  select id, titel, ort, flaeche, preis_pro_m2, nutzung, eigenschaften, verfuegbar_ab, status, created_at
  from objekte
  where status in ('verfuegbar', 'reserviert');
grant select on objekte_oeffentlich to anon, authenticated;

-- Anonyme Besucher schreiben nie direkt in eine Tabelle (Formulare laufen ab N5
-- über Server Actions mit Service-Role-Key).
revoke insert, update, delete on all tables in schema public from anon;

-- Start-Konto. Auf einer frischen Datenbank ohne dieses Konto ist das ein No-op.
update profiles set darf_nutzer_anlegen = true
  where user_id = (select id from auth.users where email = 'vermittler@immoheart.com');
```

- [ ] **Step 2: Migration einspielen**

Über das Supabase-MCP-Tool `apply_migration` mit `project_id = rvxlvrrpltmuzuomdwdf`, `name = konten_a` und dem Dateiinhalt. (Alternativ `supabase db push`, falls die CLI verknüpft ist.)

- [ ] **Step 3: Wirkung prüfen** (per `execute_sql`)

```sql
select email, darf_nutzer_anlegen, aktiv from profiles p join auth.users u on u.id = p.user_id;
set local role anon;
select count(*) from objekte_oeffentlich;
```

Expected: `vermittler@immoheart.com` mit `darf_nutzer_anlegen = true`; die anon-Abfrage liefert `6`.

Zusätzlich die Adresse als anon abfragen, muss scheitern:

```sql
set local role anon;
select adresse from objekte limit 1;
```

Expected: `ERROR: permission denied for table objekte`.

- [ ] **Step 4: Alte Production-App prüfen**

`https://immoheart.vercel.app/login` aufrufen und bestätigen, dass die Seite lädt (die alte App liest nichts, was Teil A verändert hat). Keine weiteren Schritte nötig.

- [ ] **Step 5: Typen neu erzeugen**

```bash
npm run types
```

Falls die Supabase-CLI nicht angemeldet ist: MCP-Tool `generate_typescript_types` aufrufen und die Ausgabe nach `types/database.ts` schreiben. Expected: `profiles.Row` enthält `darf_nutzer_anlegen` und `aktiv`, `Views` enthält `objekte_oeffentlich`.

- [ ] **Step 6: Supabase-Advisor prüfen**

MCP-Tool `get_advisors` (Typ `security`). Expected: keine neue Warnung zu `ist_aktives_konto` oder `objekte_oeffentlich`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260926100000_konten_a.sql types/database.ts
git commit -m "feat(db): Konto-Modell (aktiv, darf_nutzer_anlegen) und oeffentliche Objekt-View"
```

---

### Task 4: Migration B (aufräumend) schreiben — noch NICHT einspielen

**Files:**
- Create: `supabase/migrations/20260926100100_konten_b.sql`
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Migration schreiben** — `supabase/migrations/20260926100100_konten_b.sql`:

```sql
-- Relaunch N1, Teil B: Altlasten entfernen. Erst einspielen, wenn der Code aus
-- feature/n1-fundament auf Production läuft (siehe Plan N1, Task 11).

-- Alle Policies aus dem alten Rollenmodell entfernen, die neuen "aktives konto"-
-- und "oeffentlich"-Policies aus Teil A bleiben.
do $$
declare r record;
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and policyname not like 'aktives konto %'
      and policyname not like 'oeffentlich %'
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

drop view if exists anfragen_sichtbar;
drop table if exists regeln;

alter table anfragen drop column if exists vertraulich;

alter table profiles drop constraint if exists profiles_freigabe_stufe_range;
alter table profiles drop column if exists freigabe_stufe;
drop function if exists current_rolle();
alter table profiles drop column if exists rolle;
drop type if exists rolle_enum;

delete from auth.users where email = 'test@immoheart.com';
```

- [ ] **Step 2: `supabase/seed.sql` anpassen**

Den `insert into regeln …`-Block vollständig entfernen. Im `insert into anfragen …` die Spalte `vertraulich` aus der Spaltenliste und den zugehörigen Wert (`true`/`false`) aus jeder Wertezeile entfernen. Prüfen:

```bash
grep -n "regeln\|vertraulich" supabase/seed.sql
```

Expected: keine Treffer.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260926100100_konten_b.sql supabase/seed.sql
git commit -m "feat(db): Aufraeum-Migration fuer leser, Freigabe, Regeln, vertraulich (noch nicht eingespielt)"
```

---

### Task 5: Pfadlogik testgetrieben, Middleware und Abmelden

**Files:**
- Create: `lib/routen.ts`, `lib/routen.test.ts`, `app/abmelden/route.ts`
- Modify: `middleware.ts`, `lib/queries/profile.ts`

**Interfaces:**
- Produces: `istAdminPfad(pfad: string): boolean`, `ADMIN_START = "/admin"`, `LOGIN_PFAD = "/login"` aus `@/lib/routen`. Route `GET|POST /abmelden` meldet ab und leitet nach `/login` um. `holeEigenesProfil(): Promise<Profil>` leitet bei fehlendem oder inaktivem Profil nach `/abmelden` um.

- [ ] **Step 1: Failing test** — `lib/routen.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { istAdminPfad } from "./routen"

describe("istAdminPfad", () => {
  it("erkennt /admin und alles darunter", () => {
    expect(istAdminPfad("/admin")).toBe(true)
    expect(istAdminPfad("/admin/")).toBe(true)
    expect(istAdminPfad("/admin/postfach")).toBe(true)
    expect(istAdminPfad("/admin/objekte/123")).toBe(true)
  })

  it("lässt ähnliche, aber andere Pfade durch", () => {
    expect(istAdminPfad("/administration")).toBe(false)
    expect(istAdminPfad("/adminx")).toBe(false)
    expect(istAdminPfad("/")).toBe(false)
    expect(istAdminPfad("/objekte")).toBe(false)
    expect(istAdminPfad("/login")).toBe(false)
  })

  it("ist nicht über Grossschreibung zu umgehen", () => {
    expect(istAdminPfad("/Admin")).toBe(true)
    expect(istAdminPfad("/ADMIN/postfach")).toBe(true)
  })
})
```

- [ ] **Step 2: Test ausführen**

Run: `npx vitest run lib/routen.test.ts`
Expected: FAIL — `Failed to resolve import "./routen"`.

- [ ] **Step 3: Implementierung** — `lib/routen.ts`:

```ts
export const ADMIN_START = "/admin"
export const LOGIN_PFAD = "/login"

// Exakter Segmentvergleich statt startsWith("/admin"): sonst würde "/administration"
// als geschützt gelten und umgekehrt könnte ein Präfix-Fehler eine Admin-Route
// durchlassen. Kleinschreibung, weil Next.js-Routen auf Vercel sonst je nach
// Schreibweise unterschiedlich behandelt werden könnten.
export function istAdminPfad(pfad: string): boolean {
  const klein = pfad.toLowerCase()
  return klein === ADMIN_START || klein.startsWith(`${ADMIN_START}/`)
}
```

- [ ] **Step 4: Test ausführen**

Run: `npx vitest run lib/routen.test.ts`
Expected: PASS (3 Tests).

- [ ] **Step 5: `middleware.ts` ersetzen**

```ts
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { ADMIN_START, LOGIN_PFAD, istAdminPfad } from "@/lib/routen"

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

  const pfad = request.nextUrl.pathname

  // NextResponse.redirect baut ein neues Response-Objekt; ohne Übernahme gingen
  // von setAll erneuerte Session-Cookies auf den Redirect-Pfaden verloren.
  function mitAktualisiertenCookies(ziel: NextResponse): NextResponse {
    for (const cookie of response.cookies.getAll()) ziel.cookies.set(cookie)
    return ziel
  }

  if (!user && istAdminPfad(pfad)) {
    return mitAktualisiertenCookies(NextResponse.redirect(new URL(LOGIN_PFAD, request.url)))
  }
  if (user && pfad === LOGIN_PFAD) {
    return mitAktualisiertenCookies(NextResponse.redirect(new URL(ADMIN_START, request.url)))
  }

  return response
}

// Öffentliche Seiten brauchen keine Session -- die Middleware läuft nur dort,
// wo Login-Zustand eine Rolle spielt. "/admin/:path*" deckt auch "/admin" ab.
export const config = {
  matcher: ["/admin/:path*", "/login"],
}
```

- [ ] **Step 6: Abmelden-Route** — `app/abmelden/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server"
import { erstelleServerClient } from "@/lib/supabase/server"
import { LOGIN_PFAD } from "@/lib/routen"

async function abmelden(request: NextRequest): Promise<NextResponse> {
  const supabase = await erstelleServerClient()
  await supabase.auth.signOut()
  // 303, damit ein POST aus dem Abmelden-Formular als GET auf /login weitergeht.
  return NextResponse.redirect(new URL(LOGIN_PFAD, request.url), 303)
}

export const GET = abmelden
export const POST = abmelden
```

- [ ] **Step 7: `lib/queries/profile.ts` ersetzen**

```ts
import { redirect } from "next/navigation"
import { erstelleServerClient } from "@/lib/supabase/server"
import type { Profil } from "@/types"

export async function holeEigenesProfil(): Promise<Profil> {
  const supabase = await erstelleServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle()
  if (error) throw error
  // Ohne Profil oder mit deaktiviertem Konto liefert RLS keine Zeile. Ein Redirect
  // direkt auf /login würde von der Middleware sofort nach /admin zurückgeschickt
  // (die Session besteht ja noch) -- deshalb zuerst abmelden.
  if (!data || !data.aktiv) redirect("/abmelden")
  return data
}
```

- [ ] **Step 8: Prüfen und committen**

```bash
npm run lint && npx tsc --noEmit && npm run test
git add lib/routen.ts lib/routen.test.ts middleware.ts app/abmelden/route.ts lib/queries/profile.ts
git commit -m "feat: Middleware schuetzt nur /admin, Abmelden-Route, inaktive Konten werden abgemeldet"
```

---

### Task 6: Admin-Bereich nach `/admin` verschieben

**Files:**
- Move: `app/(app)/` → `app/admin/`
- Delete: `app/admin/regeln/`
- Modify: `app/actions/anfragen.ts`, `app/actions/matches.ts`, `app/actions/nachrichten.ts`, `app/actions/objekte.ts`, `app/(auth)/login/page.tsx`, `components/layout/Sidebar.tsx`, `app/admin/error.tsx`

**Interfaces:**
- Produces: Admin-Seiten unter `/admin`, `/admin/postfach`, `/admin/anfragen`, `/admin/objekte`, `/admin/zahlen`.

- [ ] **Step 1: Verschieben**

```bash
git mv "app/(app)" app/admin
git rm -r app/admin/regeln
```

- [ ] **Step 2: Alle `revalidatePath`-Aufrufe anpassen**

Ersetzungsregel in `app/actions/*.ts`: `revalidatePath("/")` → `revalidatePath("/admin")`, `revalidatePath("/postfach")` → `revalidatePath("/admin/postfach")`, `revalidatePath("/anfragen")` → `revalidatePath("/admin/anfragen")`, `revalidatePath("/objekte")` → `revalidatePath("/admin/objekte")`. Zeilen mit `revalidatePath("/regeln")` löschen.

```bash
grep -rn 'revalidatePath("/' app/actions
```

Expected: nur noch Pfade, die mit `/admin` beginnen. (`app/actions/profile.ts` und `app/actions/regeln.ts` werden in Task 7 gelöscht und dürfen hier noch auftauchen.)

- [ ] **Step 3: Login-Seite** — in `app/(auth)/login/page.tsx`: `router.push("/")` → `router.push("/admin")`; den gesamten Absatz mit `<Link href="/register" …>` entfernen und den dann unbenutzten `Link`-Import löschen. Zusätzlich unter dem Formular einen Link zurück zur Website:

```tsx
<a href="/" className="text-center text-sm text-ink-2 hover:text-brand">← Zur Website</a>
```

- [ ] **Step 4: Sidebar** — `components/layout/Sidebar.tsx` ersetzen:

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Building2, ExternalLink, HeartHandshake, Inbox, LogOut, Search } from "lucide-react"
import type { Profil } from "@/types"

const EINTRAEGE = [
  { pfad: "/admin", label: "Matches", Icon: HeartHandshake },
  { pfad: "/admin/postfach", label: "Postfach", Icon: Inbox },
  { pfad: "/admin/anfragen", label: "Anfragen", Icon: Search },
  { pfad: "/admin/objekte", label: "Objekte", Icon: Building2 },
  { pfad: "/admin/zahlen", label: "Zahlen", Icon: BarChart3 },
]

export function Sidebar({ profil, postfachAnzahl }: { profil: Profil; postfachAnzahl: number }) {
  const pfad = usePathname()
  // filter(Boolean) fängt doppelte Leerzeichen und leere Namen ab.
  const initialen =
    profil.name
      .split(" ")
      .map((teil) => teil[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"

  return (
    <aside className="flex h-screen w-[206px] flex-none flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-2 px-4 pb-3.5 pt-4">
        <span className="font-display text-lg font-bold text-ink">immoheart</span>
      </div>
      <span className="border-b border-line px-4 pb-3.5 text-xs text-ink-3">Admin</span>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2.5">
        {EINTRAEGE.map(({ pfad: ziel, label, Icon }) => {
          const aktiv = pfad === ziel
          return (
            <Link
              key={ziel}
              href={ziel}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${
                aktiv ? "bg-brand-soft font-semibold text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon className="size-4 opacity-80" aria-hidden />
              {label}
              {ziel === "/admin/postfach" && postfachAnzahl > 0 && (
                <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-on-brand">
                  {postfachAnzahl}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-line p-2.5">
        <a href="/" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-2 hover:bg-surface-2">
          <ExternalLink className="size-4 opacity-80" aria-hidden />
          Zur Website
        </a>
        <form action="/abmelden" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-2 hover:bg-surface-2"
          >
            <LogOut className="size-4 opacity-80" aria-hidden />
            Abmelden
          </button>
        </form>
      </div>

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

- [ ] **Step 5: Fehlerseite** — in `app/admin/error.tsx` den Satzteil „oder daran, dass Ihr Profil nicht korrekt eingerichtet ist — wenden Sie sich in letzterem Fall an eine Administratorin“ ersetzen durch „Bitte versuchen Sie es erneut.“ (der Absatz endet dann nach „Verbindung liegen.“ + diesem Satz).

- [ ] **Step 6: Prüfen**

```bash
npx tsc --noEmit
```

Expected: Fehler nur noch in Dateien, die Task 7 bearbeitet (Verweise auf `regeln`, `freigabe_stufe`, `anfragen_sichtbar`, `vertraulich`, `rolle`). Keine Fehler zu verschobenen Pfaden.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: Admin-Bereich nach /admin verschoben, Sidebar mit Abmelden und Zur Website"
```

---

### Task 7: Altlasten aus dem Code entfernen (Freigabe, Regeln, Register, leser, vertraulich)

**Files:**
- Delete: `app/(auth)/register/page.tsx`, `app/actions/regeln.ts`, `app/actions/profile.ts`, `lib/queries/regeln.ts`, `components/regeln/RegelnListe.tsx`, `components/layout/FreigabeSchalter.tsx`
- Modify: `app/actions/nachrichten.ts`, `app/actions/matches.ts`, `lib/queries/anfragen.ts`, `lib/queries/matches.ts`, `lib/queries/zahlen.ts`, `app/admin/zahlen/page.tsx`, `app/admin/page.tsx`, `components/anfragen/AnfragenTabelle.tsx`, `components/anfragen/AnfrageDetail.tsx`, `components/matches/MatchesAnsicht.tsx`, `components/matches/MatchCard.tsx`, `components/matches/MatchDetail.tsx`, `components/matches/PulsHero.tsx`, `components/postfach/EntwurfDetail.tsx`, `components/postfach/PostfachAnsicht.tsx`

**Interfaces:**
- Produces: `AnfrageMitFirma = AnfrageRow & { firma: { name: string; website: string | null } | null }` (Basistabelle, `id`/`letzter_kontakt` nicht mehr nullable); `NeuerMatch.anfrage` ohne `vertraulich`; `entwurfVerwerfen(nachrichtId: string): Promise<void>` (ein Parameter); `ZahlenKennzahlen` ohne `freigabequoteProzent`.

- [ ] **Step 1: Dateien löschen**

```bash
git rm "app/(auth)/register/page.tsx" app/actions/regeln.ts app/actions/profile.ts lib/queries/regeln.ts components/regeln/RegelnListe.tsx components/layout/FreigabeSchalter.tsx
```

- [ ] **Step 2: `app/actions/nachrichten.ts`**

1. Import `legeRegelAn, naechsterRegelCode` und Import `holeEigenesProfil` entfernen.
2. Die gesamte Funktion `sendeWennFreigegeben` samt Kommentar darüber entfernen.
3. In `nachrichtEingegangen` den Aufruf `await sendeWennFreigegeben(rueckfrageNachricht, 2)` entfernen; die Zuweisung `const rueckfrageNachricht = await legeNachrichtAn({...})` wird zu `await legeNachrichtAn({...})`.
4. `entwurfVerwerfen` ersetzen durch:

```ts
export async function entwurfVerwerfen(nachrichtId: string): Promise<void> {
  await loescheNachricht(nachrichtId)
  revalidatePath("/admin/postfach")
}
```

- [ ] **Step 3: `app/actions/matches.ts`**

1. Import `sendeWennFreigegeben` entfernen.
2. In `matchSenden` die Zeilen `// Angebote gehen laut README …` und `await sendeWennFreigegeben(nachricht, 3)` entfernen; `const nachricht = await legeNachrichtAn({...})` wird zu `await legeNachrichtAn({...})`.
3. In `anfrageNachfragen` ebenso `// Spec-Annahme A2 …` und `await sendeWennFreigegeben(nachricht, 2)` entfernen, `const nachricht =` streichen.
4. Den langen Kommentar über `aktualisiereMatchStatus` kürzen auf:

```ts
// Ein UPDATE ohne betroffene Zeile ist für PostgREST kein Fehler -- deshalb
// die zurückgegebene id prüfen, statt einen stillen Fehlschlag als Erfolg zu melden.
```

- [ ] **Step 4: `lib/queries/anfragen.ts`**

1. Typ ersetzen:

```ts
export type AnfrageMitFirma = AnfrageRow & { firma: { name: string; website: string | null } | null }
```

und die Zeile `type AnfrageSichtbarRow = …` löschen.

2. In `holeAnfragen` die Quelle ändern und den Kommentar darüber ersetzen:

```ts
// Firmen separat laden und im Code verknüpfen: bei null firma_id bleibt firma null.
export async function holeAnfragen(): Promise<AnfrageMitFirma[]> {
  const supabase = await erstelleServerClient()
  const [{ data: anfragenData, error: anfragenError }, { data: firmenData, error: firmenError }] = await Promise.all([
    supabase.from("anfragen").select("*").order("letzter_kontakt", { ascending: true }),
    supabase.from("firmen").select("id, name, website"),
  ])
  if (anfragenError) throw anfragenError
  if (firmenError) throw firmenError

  const firmenNachId = new Map(firmenData.map((f) => [f.id, f]))
  return anfragenData.map((a) => ({ ...a, firma: a.firma_id ? (firmenNachId.get(a.firma_id) ?? null) : null }))
}
```

3. In `holeVerlaufFuerAnfrage`: `supabase.from("anfragen_sichtbar").select("created_at")` → `supabase.from("anfragen").select("created_at")`; den Kommentarblock „Der "Anlage"-Zeitpunkt kommt bewusst aus anfragen_sichtbar …“ löschen.
4. Die Kommentare über `aktualisiereAnfrage`, `holeOffeneAnfragen`, `holeOffenePulsWerte` und `holeFirma` auf je höchstens eine Zeile kürzen, ohne leser/vertraulich-Bezug. Für `aktualisiereAnfrage`:

```ts
// UPDATE ohne betroffene Zeile ist für PostgREST kein Fehler -- deshalb die id prüfen.
```

Für die drei anderen den Kommentar ganz entfernen.

- [ ] **Step 5: `lib/queries/matches.ts`**

1. Import `holeEigenesProfil` entfernen.
2. Den Kommentarblock „Kritischer Fund (M6 Whole-Branch-Review): kriterien wird …“ sowie `BUDGET_MASKIERT`, `BUDGET_HINWEIS_MASKIERT`, `PREIS_HINWEISE` und die Funktion `maskierePreisFuerVertraulicheAnfrage` samt Kommentar löschen.
3. `holeBesterMatchFuerAnfrage` ersetzen:

```ts
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

4. Den Kommentarblock „Task 60 (Matches-Startseite): proaktiv …“ löschen und `NeuerMatch` sowie `holeNeueMatches` ersetzen:

```ts
export type NeuerMatch = {
  id: string
  score: number
  kriterien: Kriterium[]
  hinweis: string
  objekt: { titel: string; adresse: string; flaeche: number; preis_pro_m2: number | null; foto_url: string | null }
  anfrage: { id: string; flaeche_min: number | null; flaeche_max: number | null; letzter_kontakt: string }
  firma: { name: string; website: string | null } | null
}

export async function holeNeueMatches(): Promise<NeuerMatch[]> {
  const supabase = await erstelleServerClient()
  const [
    { data: matchRows, error: matchError },
    { data: anfragenData, error: anfragenError },
    { data: firmenData, error: firmenError },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("*, objekte(titel, adresse, flaeche, preis_pro_m2, foto_url)")
      .eq("status", "neu")
      .order("score", { ascending: false }),
    supabase.from("anfragen").select("id, firma_id, flaeche_min, flaeche_max, letzter_kontakt"),
    supabase.from("firmen").select("id, name, website"),
  ])
  if (matchError) throw matchError
  if (anfragenError) throw anfragenError
  if (firmenError) throw firmenError

  const anfragenNachId = new Map(anfragenData.map((a) => [a.id, a]))
  const firmenNachId = new Map(firmenData.map((f) => [f.id, f]))

  return matchRows.flatMap((m) => {
    const anfrage = anfragenNachId.get(m.anfrage_id)
    if (!anfrage || !m.objekte) return []
    return [
      {
        id: m.id,
        score: m.score,
        kriterien: m.kriterien as Kriterium[],
        hinweis: m.hinweis,
        objekt: m.objekte,
        anfrage: {
          id: anfrage.id,
          flaeche_min: anfrage.flaeche_min,
          flaeche_max: anfrage.flaeche_max,
          letzter_kontakt: anfrage.letzter_kontakt,
        },
        firma: anfrage.firma_id ? (firmenNachId.get(anfrage.firma_id) ?? null) : null,
      },
    ]
  })
}
```

- [ ] **Step 6: Komponenten ohne vertraulich und ohne View-Null-Prüfungen**

`components/anfragen/AnfragenTabelle.tsx`: Den Kommentar „anfragen_sichtbar ist eine View …“ und den Block `if (a.id === null || a.letzter_kontakt === null) { … return null }` entfernen. Die Firmenzelle ersetzen durch:

```tsx
<td className="px-4 py-2.5 text-sm font-medium text-ink">{a.firma?.name ?? luecke}</td>
```

`components/anfragen/AnfrageDetail.tsx`: Den Kommentar „anfragen_sichtbar ist eine View …“ und den Block `if (anfrage.id === null || anfrage.letzter_kontakt === null) { … }` (inklusive des Fehler-Drawers) entfernen. `const id = anfrage.id` und `const letzterKontakt = anfrage.letzter_kontakt` bleiben. Alle weiteren Vorkommen von `vertraulich` in der Datei entfernen (`grep -n vertraulich` muss danach leer sein).

`components/matches/MatchesAnsicht.tsx`: In der „Lange nichts gehört“-Schleife Kommentar und `if (a.id === null || …) { … }` entfernen; `const wer = a.firma?.name ?? "diese Anfrage"`; die Anzeige `{a.firma?.name ?? "?"}`. Den Kommentar über Zeile 26–29 („liest und für die Rolle leser …“) entfernen.

`components/matches/MatchCard.tsx`: `{match.firma?.name ?? (match.anfrage.vertraulich ? "vertraulich" : "?")}` → `{match.firma?.name ?? "?"}`.

`components/matches/MatchDetail.tsx`: im `untertitel` `(letzterMatch.anfrage.vertraulich ? "vertraulich" : "?")` → `"?"`.

`components/matches/PulsHero.tsx`: den Kommentar „Kein Kontakt sichtbar (z. B. Rolle "leser" …)“ ersetzen durch:

```tsx
  // Ohne offene Anfragen gibt es keinen Puls -- eigener Leerzustand statt einer 0,
  // die als "alles kritisch" gelesen würde.
```

`app/admin/page.tsx`: den Kommentarblock „offeneAnzahl/langeStillAnzahl … bewusst aus `anfragen` …“ entfernen; der Code bleibt.

`components/postfach/PostfachAnsicht.tsx`: im Kommentar vor `rueckfrageOeffnen` den ersten Absatz („Fix-Loop Runde 3 … richtung wird deshalb hier komplett aus dem Treffer-Kriterium entfernt.“) löschen; der zweite Absatz ab „Es gibt in nachrichten kein Fremdschlüsselfeld …“ bleibt.

- [ ] **Step 7: `components/postfach/EntwurfDetail.tsx` — Verwerfen ohne Grund**

1. `const GRUENDE = […]`, den State `grundAktiv` samt Kommentar und `setGrundAktiv(null)` im Reset-Effekt entfernen.
2. `verwerfen` ersetzen (Muster wie die anderen Aktionen der Datei):

```tsx
  async function verwerfen() {
    const zielId = nachricht.id
    setLaufend("verwerfen")
    setFehler(null)
    try {
      await entwurfVerwerfen(nachricht.id)
      if (nachrichtIdRef.current === zielId) setVerwerfenOffen(false)
    } catch (e) {
      if (nachrichtIdRef.current === zielId) {
        setFehler(e instanceof Error ? e.message : "Verwerfen fehlgeschlagen")
      }
    } finally {
      if (nachrichtIdRef.current === zielId) setLaufend(null)
    }
  }
```

(Vorher die bestehende `verwerfen(grund)`-Implementierung ansehen und deren Fehlermeldungstext übernehmen, falls er abweicht.)

3. Den Block `{verwerfenOffen && ( … GRUENDE.map … )}` ersetzen durch:

```tsx
        {verwerfenOffen && (
          <div className="mt-3 flex items-center gap-2 border-t border-dashed border-line-2 pt-3 text-sm text-ink-2">
            Entwurf wirklich löschen?
            <Button onClick={verwerfen} disabled={laufend !== null}>
              {laufend === "verwerfen" ? "Wird gelöscht…" : "Ja, löschen"}
            </Button>
          </div>
        )}
```

- [ ] **Step 8: Zahlen ohne Freigabequote**

`lib/queries/zahlen.ts`: Den grossen Kommentarblock am Dateianfang (leser/Basistabelle) löschen. `freigabequoteProzent` aus dem Typ `ZahlenKennzahlen` und aus dem Rückgabeobjekt (inkl. Kommentarzeile) entfernen.

`app/admin/zahlen/page.tsx`: Die vierte Kachel („Freigabequote“) entfernen; den Kommentarblock über `const hatDaten` ersetzen durch:

```tsx
  // Ohne Anfragen gibt es keinen Verlauf -- dann zeigen alle abgeleiteten Kacheln "keine Daten".
```

- [ ] **Step 9: Restprüfung**

```bash
grep -rnE "vertraulich|anfragen_sichtbar|freigabe|Freigabe|regeln|Regel|/register|leser|rolle" app components lib --include=*.ts --include=*.tsx | grep -v "types/database.ts"
```

Expected: keine Treffer (Kommentare mit diesen Wörtern ebenfalls bereinigen).

```bash
npm run lint && npx tsc --noEmit && npm run test && npm run build
```

Expected: alles grün.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: Freigabestufen, Regeln, Registrierung, leser-Rolle und Vertraulich-Maskierung entfernt"
```

---

### Task 8: Öffentliches Grundgerüst

**Files:**
- Create: `app/(public)/layout.tsx`, `app/(public)/page.tsx`, `components/public/SiteHeader.tsx`, `components/public/SiteFooter.tsx`, `components/public/HerzLogo.tsx`
- Modify: `app/globals.css` (Keyframes `herzschlag`)

**Interfaces:**
- Produces: `<HerzLogo className?: string />` (schlagendes Herz + Wortmarke), `<SiteHeader />`, `<SiteFooter />`, CSS-Klasse `animate-herzschlag`. N6 ersetzt `app/(public)/page.tsx` durch die volle Landingpage und erweitert die Navigation.

- [ ] **Step 1: Herzschlag-Animation** — ans Ende von `app/globals.css`:

```css
@theme {
  --animate-herzschlag: herzschlag 1.2s ease-in-out infinite;
}

@keyframes herzschlag {
  0%, 40%, 100% { transform: scale(1); }
  10% { transform: scale(1.18); }
  20% { transform: scale(1); }
  30% { transform: scale(1.12); }
}

@media (prefers-reduced-motion: reduce) {
  .animate-herzschlag { animation: none; }
}
```

- [ ] **Step 2: `components/public/HerzLogo.tsx`**

```tsx
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"

export function HerzLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-xl font-bold text-ink", className)}>
      <Heart className="size-5 animate-herzschlag fill-heart text-heart" aria-hidden />
      immoheart
    </span>
  )
}
```

- [ ] **Step 3: `components/public/SiteHeader.tsx`**

```tsx
import Link from "next/link"
import { LogIn } from "lucide-react"
import { HerzLogo } from "./HerzLogo"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-surface/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" aria-label="immoheart Startseite">
          <HerzLogo />
        </Link>
        <span className="flex-1" />
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line-2 px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-2"
        >
          <LogIn className="size-4" aria-hidden />
          Login
        </Link>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: `components/public/SiteFooter.tsx`**

```tsx
import { HerzLogo } from "./HerzLogo"

const MAIL = "immoheart.business@gmail.com"

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-ink-2 sm:flex-row sm:items-center">
        <HerzLogo className="text-base" />
        <span className="text-ink-3">ein Angebot von espaceSOLOTHURN</span>
        <span className="flex-1" />
        <a href={`mailto:${MAIL}`} className="hover:text-brand">{MAIL}</a>
      </div>
    </footer>
  )
}
```

- [ ] **Step 5: `app/(public)/layout.tsx`**

```tsx
import type { ReactNode } from "react"
import { SiteHeader } from "@/components/public/SiteHeader"
import { SiteFooter } from "@/components/public/SiteFooter"

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
```

- [ ] **Step 6: `app/(public)/page.tsx`** (Übergangsfassung bis N6, liest bereits die öffentliche View)

```tsx
import { erstelleServerClient } from "@/lib/supabase/server"

export const revalidate = 300

export default async function StartSeite() {
  const supabase = await erstelleServerClient()
  const { count } = await supabase.from("objekte_oeffentlich").select("id", { count: "exact", head: true })

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-24">
      <h1 className="max-w-3xl font-display text-5xl font-bold leading-tight text-ink sm:text-6xl">
        Gewerbeflächen mit <span className="text-heart">Herzschlag</span>.
      </h1>
      <p className="max-w-xl text-lg text-ink-2">
        Büro, Gewerbe, Produktion und Lager in der Region Solothurn — persönlich vermittelt.
      </p>
      <p className="text-sm text-ink-3">{count ?? 0} Objekte verfügbar · Website im Aufbau</p>
    </section>
  )
}
```

Die Abfrage läuft als anonymer Besucher; ein Fehler (z. B. Netzwerk) soll die Startseite nicht umwerfen — deshalb nur `count` lesen und `?? 0`.

- [ ] **Step 7: Prüfen**

```bash
npm run lint && npx tsc --noEmit && npm run build
```

`npm run dev`, dann in einem privaten Fenster `http://localhost:3000/` öffnen. Expected: Startseite ohne Login sichtbar, Header mit schlagendem Herz und „Login“, Text „6 Objekte verfügbar“. `http://localhost:3000/admin` im privaten Fenster → Umleitung auf `/login`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: oeffentliches Grundgeruest mit Herz-Logo, Header und Footer"
```

---

### Task 9: Keep-alive, Env-Vorlage und Doku anpassen

**Files:**
- Modify: `.github/workflows/keep-alive.yml`, `.env.example`, `docs/setup-secrets.md`, `README.md`

- [ ] **Step 1: Keep-alive** — in `.github/workflows/keep-alive.yml` die URL ersetzen:

```yaml
            "${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}/rest/v1/objekte_oeffentlich?select=id&limit=1" \
```

(Nach Migration B existiert `regeln` nicht mehr; `objekte_oeffentlich` ist für den anon-Key lesbar.)

- [ ] **Step 2: `.env.example`** — ergänzen:

```
GMAIL_USER=
GMAIL_APP_PASSWORD=
```

- [ ] **Step 3: `docs/setup-secrets.md`** — in der Tabelle „Die vier Werte“ die Überschrift zu „Die Werte“ ändern und zwei Zeilen anfügen:

```markdown
| `GMAIL_USER` | ja | `immoheart.business@gmail.com` |
| `GMAIL_APP_PASSWORD` | **nein — geheim** | Google-Konto von immoheart.business → *Sicherheit* → 2-Schritt-Verifizierung aktivieren → [App-Passwörter](https://myaccount.google.com/apppasswords) → Name „immoheart“ → 16 Zeichen **ohne Leerzeichen** eintragen |
```

Im Abschnitt „1 · Vercel“ den Codeblock um `GMAIL_USER` und `GMAIL_APP_PASSWORD` ergänzen und die Checkliste um zwei Einträge `- [ ] Vercel: GMAIL_USER (Production + Preview)` / `- [ ] Vercel: GMAIL_APP_PASSWORD (Production + Preview)`.

- [ ] **Step 4: `README.md`** — Abschnitt „## Stand“ ersetzen durch:

```markdown
## Stand

Relaunch zur öffentlichen Website mit Admin-Bereich in Arbeit. Verbindlich ist
`docs/superpowers/specs/2026-09-26-relaunch-design.md`; wo dieses README
widerspricht (Rollen, Freigabestufen, kein Mailversand, Gestaltung), gilt die Spec.
Der Stand vor dem Relaunch liegt auf dem Branch `oldversion`.
```

Im Abschnitt „## Aufbau“ `(app)/` durch `admin/` ersetzen, die Zeile `regeln/ …` löschen und `(public)/ öffentliche Website` ergänzen.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/keep-alive.yml .env.example docs/setup-secrets.md README.md
git commit -m "docs: Gmail-Variablen, Keep-alive auf oeffentliche View, README-Verweis auf Relaunch-Spec"
```

---

### Task 10: Gesamtprüfung lokal

- [ ] **Step 1: Alle Checks**

```bash
npm run lint && npx tsc --noEmit && npm run test && npm run build && npm audit --omit=dev
```

Expected: grün, keine `high`/`critical`.

- [ ] **Step 2: Lokaler Rundgang** (`npm run dev`, eingeloggt als `vermittler@immoheart.com` — Davide meldet sich selbst an, das Passwort wird nicht weitergegeben)

| Schritt | Erwartet |
|---|---|
| `/` ohne Login | Startseite, Login-Knopf |
| `/admin` ohne Login | Umleitung `/login` |
| Login | Umleitung `/admin`, Matches mit Bestandspuls |
| `/admin/postfach`, `/admin/anfragen`, `/admin/objekte`, `/admin/zahlen` | laden fehlerfrei, Daten wie vorher |
| `/admin/regeln`, `/register` | 404 |
| Anfrage im Drawer bearbeiten und speichern | gespeichert, „Treffer werden neu berechnet“ |
| Objekt bearbeiten und speichern | gespeichert |
| Hell/Dunkel umschalten | beide Themen korrekt |
| „Abmelden“ | zurück auf `/login`, `/admin` danach wieder gesperrt |

- [ ] **Step 3: Push**

```bash
git push -u origin feature/n1-fundament
```

---

### Task 11: Live-Test auf dem Vercel-Preview, Merge, Migration B

- [ ] **Step 1: CI und Preview-URL**

```bash
gh run list --branch feature/n1-fundament --limit 1
gh api repos/dav08No/immoheart/commits/$(git rev-parse HEAD)/statuses --jq '.[] | select(.context | test("Vercel")) | .target_url' | head -1
```

Expected: CI `success`; eine Vercel-URL. Falls keine Status-URL: Davide nach der Preview-URL aus dem Vercel-Dashboard fragen.

- [ ] **Step 2: Live-Test im Browser** (Chrome-Erweiterung, neuer Tab; Davide ist in seinem Chrome eingeloggt bzw. meldet sich auf der Preview selbst an)

Dieselbe Tabelle wie Task 10, Step 2, gegen die Preview-URL. Zusätzlich:

```bash
curl -s "https://rvxlvrrpltmuzuomdwdf.supabase.co/rest/v1/objekte?select=adresse&limit=1" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

(Key aus `.env.local`.) Expected: Fehler `permission denied` — Adresse für anonyme Besucher nicht lesbar.

Ergebnis Davide melden und **auf sein OK für den Merge warten**.

- [ ] **Step 3: Merge auf main** (nach OK)

```bash
git checkout main && git pull --ff-only
git merge --no-ff feature/n1-fundament -m "Merge feature/n1-fundament: Relaunch N1 Fundament"
git push origin main
```

- [ ] **Step 4: Production-Deploy abwarten**

```bash
gh api repos/dav08No/immoheart/commits/$(git rev-parse HEAD)/statuses --jq '.[] | select(.context | test("Vercel")) | .state' | head -1
```

Wiederholen, bis `success`. Dann `https://immoheart.vercel.app/` und `/admin` kurz prüfen (Startseite öffentlich, Admin nach Login).

- [ ] **Step 5: Migration B einspielen**

Erst jetzt, da Production den neuen Code nutzt: MCP `apply_migration` mit `name = konten_b` und dem Inhalt von `supabase/migrations/20260926100100_konten_b.sql`.

Prüfen:

```sql
select policyname, tablename from pg_policies where schemaname = 'public' order by 2, 1;
select column_name from information_schema.columns where table_name = 'profiles' and table_schema = 'public';
select email from auth.users;
```

Expected: nur Policies „aktives konto …“ und „oeffentlich …“; `profiles` ohne `rolle`/`freigabe_stufe`; nur noch `vermittler@immoheart.com`.

- [ ] **Step 6: Production nach Migration B prüfen**

`/admin`, `/admin/postfach`, `/admin/anfragen`, `/admin/objekte`, `/admin/zahlen` auf `immoheart.vercel.app` laden. Expected: fehlerfrei. `get_advisors` (security): keine neuen Warnungen.

- [ ] **Step 7: Typen nach Migration B nachziehen**

```bash
git checkout -b chore/n1-typen
npm run types
npm run lint && npx tsc --noEmit && npm run build
git add types/database.ts
git commit -m "chore: Typen nach Aufraeum-Migration neu erzeugt"
git checkout main && git merge --no-ff chore/n1-typen -m "Merge chore/n1-typen" && git push origin main
```

Expected: tsc grün (der Code verwendet keine entfernten Spalten mehr).

---

## Abnahme N1

- `/` ist ohne Login erreichbar; `/admin/*` leitet ohne Login auf `/login`.
- Alle bisherigen Admin-Funktionen (Matches, Postfach inkl. Mail einfügen und Entwurf senden/verwerfen, Anfragen, Objekte, Zahlen) funktionieren unter `/admin`.
- Kein Freigabe-Schalter, keine Regeln-Seite, keine Registrierung, keine leser-Rolle, kein „vertraulich“ mehr — im Code und in der Datenbank.
- Anonyme Abfragen können Adresse und Eigentümer eines Objekts nicht lesen.
- `vermittler@immoheart.com` hat `darf_nutzer_anlegen = true`; `test@immoheart.com` existiert nicht mehr.
- CI grün, `npm audit --omit=dev` ohne `high`/`critical`.
