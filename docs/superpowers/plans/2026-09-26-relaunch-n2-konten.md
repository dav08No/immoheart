# Relaunch N2 · Gmail-Versand, Nutzerverwaltung, Passwort-Flows — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Systemmails über Gmail-SMTP, Nutzerverwaltung unter `/admin/nutzer` (anlegen mit Einladung, Recht setzen, deaktivieren/reaktivieren, Einladung erneut senden), Passwort setzen / vergessen / ändern und eine Profilseite.

**Architecture:** Konten werden ausschliesslich serverseitig mit dem Service-Role-Key angelegt (`lib/supabase/admin.ts`, nur Server). Einladungs- und Reset-Links erzeugt `auth.admin.generateLink`; die App baut daraus einen eigenen Link `…/auth/bestaetigen?token_hash=…&typ=…`, den die Route per `verifyOtp` einlöst (setzt die Session-Cookies) und auf `/passwort-setzen` weiterleitet. Mails gehen über `nodemailer` an Gmail-SMTP. Deaktivieren = `profiles.aktiv = false` plus Auth-Sperre (`ban_duration`).

**Tech Stack:** Next.js 15.5 App Router, Supabase (`@supabase/supabase-js` 2.58 / `@supabase/ssr`), nodemailer 10.0.10 (bringt eigene Typen mit — **kein** `@types/nodemailer`), zod 4.6.5, server-only 0.0.1, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-26-relaunch-design.md` (Abschnitte 1 „Konten“, 2 „Systemmails“, 3 „/admin/nutzer“, „Seitenleiste“, 5 „Sicherheit“)

**Vorab geprüft (Controller, live):** `generateLink` für `invite` und `recovery`, `updateUserById({ ban_duration })` und `deleteUser` funktionieren mit dem Service-Role-Key, obwohl Selbstregistrierung ausgeschaltet ist. Ein per `invite` erzeugter Nutzer bekommt **kein** Profil automatisch (Trigger existiert nicht mehr). IMAP-Login mit dem App-Passwort funktioniert.

## Global Constraints

- Alle Regeln aus N1 gelten weiter: deutsche Fachbegriffe / englische Technik, kein `any`, Dateien möglichst < 200 Zeilen, Datenzugriff nur in `lib/queries/`, Schreibzugriffe als Server Actions in `app/actions/`, Kommentare nur für das *Warum*.
- Service-Role-Key, Gmail-Zugang: nur in Dateien mit `import "server-only"` bzw. Server Actions/Route Handlers. Niemals `NEXT_PUBLIC_`.
- Jede Server Action prüft selbst: eingeloggt + `aktiv`; Nutzerverwaltungs-Actions zusätzlich `darf_nutzer_anlegen`. Nie nur die Oberfläche.
- Neue Konten setzen `profiles.aktiv = true` ausdrücklich (Spalten-Default ist `false`).
- Keine Policy und kein Grant erlaubt eingeloggten Nutzern, `aktiv` oder `darf_nutzer_anlegen` zu ändern — Änderungen nur über den Admin-Client in geprüften Actions.
- Neue Pakete exakt pinnen (`--save-exact`), danach `npm audit --omit=dev` ohne high/critical.
- Passwörter: mindestens 8 Zeichen.
- Antworten, die verraten würden, ob eine E-Mail ein Konto hat (Passwort vergessen), sind verboten — immer dieselbe Rückmeldung.
- Testmails nur an `immoheart.business+<irgendwas>@gmail.com` (landet im eigenen Postfach) oder `davide.nocito28@yahoo.com` (von Davide freigegeben).
- Jeder Commit endet mit Leerzeile und exakt:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01CbSKvzEHCKZUWFsZgFgstd`
- Arbeitsbranch: `feature/n2-konten` (Worktree `.worktrees/n2`, von `main`). Wird ein Befehl von der Berechtigungsprüfung blockiert: BLOCKED melden, nicht umgehen.

## Dateiübersicht

| Datei | Aktion | Zweck |
|---|---|---|
| `supabase/migrations/20260926200000_n2_konten.sql` | neu | Default-Privileges für anon, Profil-Update-Grant entfernen |
| `lib/supabase/admin.ts` | neu | Service-Role-Client (server-only) |
| `lib/mail/vorlagen.ts`, `.test.ts` | neu | Einladung / Passwort-Reset als Text + HTML, HTML-Escaping |
| `lib/mail/versand.ts` | neu | `sendeMail()` über Gmail-SMTP (server-only) |
| `lib/basis-url.ts`, `.test.ts` | neu | Basis-URL aus Request-Host mit Allowlist |
| `lib/routen.ts`, `.test.ts` | ändern | Link-Typ-Whitelist, Login-Hinweise |
| `app/auth/bestaetigen/route.ts` | neu | Token einlösen, weiterleiten |
| `app/(auth)/passwort-setzen/page.tsx`, `components/auth/PasswortSetzenFormular.tsx` | neu | neues Passwort setzen |
| `app/(auth)/passwort-vergessen/page.tsx`, `components/auth/PasswortVergessenFormular.tsx`, `app/actions/passwort.ts` | neu | Reset anfordern |
| `app/(auth)/login/page.tsx` | ändern | Hinweise, Link „Passwort vergessen?“ |
| `middleware.ts` | ändern | Matcher um `/passwort-setzen` |
| `lib/nutzer-regeln.ts`, `.test.ts` | neu | Regeln + zod-Schemas der Nutzerverwaltung |
| `lib/queries/nutzer.ts` | neu | Konten-Liste (Auth + Profile) |
| `lib/queries/profile.ts` | ändern | `holeBerechtigtesProfil()` |
| `app/actions/nutzer.ts` | neu | anlegen, Recht setzen, deaktivieren, reaktivieren, Einladung erneut |
| `app/admin/nutzer/page.tsx`, `components/nutzer/NutzerListe.tsx`, `components/nutzer/NeuesKontoFormular.tsx` | neu | Oberfläche Nutzerverwaltung |
| `app/admin/profil/page.tsx`, `components/profil/ProfilFormular.tsx`, `app/actions/profil.ts` | neu | Name + Passwort ändern |
| `components/layout/Sidebar.tsx` | ändern | Eintrag „Nutzer“ (nur mit Recht), Profil-Link |

---

### Task 1: Pakete und Migration C

**Files:**
- Create: `supabase/migrations/20260926200000_n2_konten.sql`
- Modify: `package.json`, `package-lock.json`, `types/database.ts` (Controller)

- [ ] **Step 1: Pakete**

```bash
npm install --save-exact nodemailer@10.0.10 zod@4.6.5 server-only@0.0.1
npm audit --omit=dev
```

Expected: keine high/critical. `@types/nodemailer` **nicht** installieren (nodemailer 10 liefert `dist/cjs/nodemailer.d.ts`).

- [ ] **Step 2: Migration schreiben** — `supabase/migrations/20260926200000_n2_konten.sql`:

```sql
-- Relaunch N2: Supabase gibt anon standardmässig volle Rechte auf jede neu
-- angelegte Tabelle, Sequenz und Funktion. Künftige Tabellen (N3+) sollen für
-- anonyme Besucher gesperrt beginnen; Freigaben erfolgen dann gezielt.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- Profile ändern nur noch geprüfte Server Actions mit dem Service-Role-Key
-- (Name, Recht, aktiv). Eingeloggte Nutzer brauchen kein direktes Update-Recht;
-- es gibt dafür auch keine Policy mehr.
revoke update on table profiles from authenticated;
```

- [ ] **Step 3: Controller spielt die Migration ein** (MCP `apply_migration`, Name `n2_konten`), prüft `select privilege_type from information_schema.table_privileges where table_name='profiles' and grantee='authenticated'` (kein UPDATE) und erzeugt die Typen neu (`npm run types`). Implementer wartet darauf nicht: Die Migration ändert keine Spalten, die Typen bleiben gleich.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json supabase/migrations/20260926200000_n2_konten.sql
git commit -m "build: nodemailer, zod, server-only; Migration fuer anon-Default-Rechte"
```

---

### Task 2: Admin-Client, Mailvorlagen (TDD), Mailversand

**Files:**
- Create: `lib/supabase/admin.ts`, `lib/mail/vorlagen.ts`, `lib/mail/vorlagen.test.ts`, `lib/mail/versand.ts`

**Interfaces:**
- Produces: `erstelleAdminClient(): SupabaseClient<Database>`; `escapeHtml(text: string): string`; `type Mail = { betreff: string; text: string; html: string }`; `einladungsMail(name: string, link: string): Mail`; `passwortResetMail(link: string): Mail`; `sendeMail(an: string, mail: Mail): Promise<{ messageId: string }>`.

- [ ] **Step 1: `lib/supabase/admin.ts`**

```ts
import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Umgeht RLS vollständig. Nur in Server Actions / Route Handlers verwenden, die
// vorher selbst geprüft haben, wer aufruft.
export function erstelleAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
```

- [ ] **Step 2: Failing tests** — `lib/mail/vorlagen.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { einladungsMail, escapeHtml, passwortResetMail } from "./vorlagen"

describe("escapeHtml", () => {
  it("maskiert alle HTML-relevanten Zeichen", () => {
    expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;"
    )
  })
})

describe("einladungsMail", () => {
  const link = "https://immoheart.vercel.app/auth/bestaetigen?token_hash=abc&typ=invite"

  it("enthält Name und Link in Text und HTML", () => {
    const mail = einladungsMail("Anna Muster", link)
    expect(mail.betreff).toBe("Einladung zu immoheart")
    expect(mail.text).toContain("Anna Muster")
    expect(mail.text).toContain(link)
    expect(mail.html).toContain(`href="${escapeHtml(link)}"`)
  })

  it("escaped den Namen im HTML", () => {
    const mail = einladungsMail("<b>Evil</b>", link)
    expect(mail.html).not.toContain("<b>Evil</b>")
    expect(mail.html).toContain("&lt;b&gt;Evil&lt;/b&gt;")
  })
})

describe("passwortResetMail", () => {
  it("enthält den Link und den festen Betreff", () => {
    const link = "https://immoheart.vercel.app/auth/bestaetigen?token_hash=xyz&typ=recovery"
    const mail = passwortResetMail(link)
    expect(mail.betreff).toBe("Passwort für immoheart zurücksetzen")
    expect(mail.text).toContain(link)
    expect(mail.html).toContain(`href="${escapeHtml(link)}"`)
  })
})
```

- [ ] **Step 3: Run** `npx vitest run lib/mail/vorlagen.test.ts` — Expected: FAIL (`Failed to resolve import "./vorlagen"`).

- [ ] **Step 4: `lib/mail/vorlagen.ts`**

```ts
export type Mail = { betreff: string; text: string; html: string }

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function htmlRahmen(absaetze: string[], link: string, knopf: string): string {
  const inhalt = absaetze.map((a) => `<p style="margin:0 0 14px">${a}</p>`).join("")
  return `<div style="font-family:Arial,sans-serif;color:#1F2429;max-width:520px">
${inhalt}<p style="margin:22px 0"><a href="${escapeHtml(link)}" style="background:#065A82;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${knopf}</a></p>
<p style="margin:0;color:#5A6472;font-size:13px">Freundliche Grüsse<br>immoheart</p></div>`
}

export function einladungsMail(name: string, link: string): Mail {
  return {
    betreff: "Einladung zu immoheart",
    text: `Guten Tag ${name}\n\nSie wurden zu immoheart eingeladen. Über diesen Link legen Sie Ihr Passwort fest:\n${link}\n\nDer Link ist nur kurze Zeit gültig. Ist er abgelaufen, nutzen Sie auf der Login-Seite „Passwort vergessen?“.\n\nFreundliche Grüsse\nimmoheart`,
    html: htmlRahmen(
      [
        `Guten Tag ${escapeHtml(name)}`,
        "Sie wurden zu immoheart eingeladen. Über den folgenden Knopf legen Sie Ihr Passwort fest.",
        "Der Link ist nur kurze Zeit gültig. Ist er abgelaufen, nutzen Sie auf der Login-Seite „Passwort vergessen?“.",
      ],
      link,
      "Passwort festlegen"
    ),
  }
}

export function passwortResetMail(link: string): Mail {
  return {
    betreff: "Passwort für immoheart zurücksetzen",
    text: `Guten Tag\n\nÜber diesen Link setzen Sie ein neues Passwort:\n${link}\n\nHaben Sie das nicht angefordert, können Sie diese Mail ignorieren.\n\nFreundliche Grüsse\nimmoheart`,
    html: htmlRahmen(
      [
        "Guten Tag",
        "Über den folgenden Knopf setzen Sie ein neues Passwort.",
        "Haben Sie das nicht angefordert, können Sie diese Mail ignorieren.",
      ],
      link,
      "Neues Passwort setzen"
    ),
  }
}
```

- [ ] **Step 5: Run** `npx vitest run lib/mail/vorlagen.test.ts` — Expected: PASS (4 Tests).

- [ ] **Step 6: `lib/mail/versand.ts`**

```ts
import "server-only"
import nodemailer from "nodemailer"
import type { Mail } from "./vorlagen"

// Pro Aufruf ein Transport statt eines Modul-Singletons: der Build darf keine
// Umgebungsvariablen brauchen (siehe Vorgänger-Spec D3).
function transport() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
}

export async function sendeMail(an: string, mail: Mail): Promise<{ messageId: string }> {
  const info = await transport().sendMail({
    from: { name: "immoheart", address: process.env.GMAIL_USER ?? "" },
    to: an,
    subject: mail.betreff,
    text: mail.text,
    html: mail.html,
  })
  return { messageId: info.messageId }
}
```

- [ ] **Step 7: Echter Versandtest** (einmalig, nicht committen): Skript `.versandtest.mts` im Worktree-Root, das mit `node --experimental-strip-types` `.env.local` einliest, `process.env` setzt und über nodemailer direkt (gleiche Transport-Optionen) `einladungsMail("Test", "https://example.invalid/test")` an `immoheart.business+n2versand@gmail.com` sendet. Ausgabe: `messageId`. Danach Skript löschen. (Das `server-only`-Modul lässt sich ausserhalb von Next nicht importieren — deshalb die Transport-Optionen im Skript wiederholen.)

- [ ] **Step 8: Prüfen + Commit**

```bash
npm run lint && npx tsc --noEmit && npm run test && npm run build
git add lib/supabase/admin.ts lib/mail
git commit -m "feat: Admin-Client, Mailvorlagen und Gmail-Versand"
```

---

### Task 3: Basis-URL, Link-Typen, Login-Hinweise (TDD) und Token-Route

**Files:**
- Create: `lib/basis-url.ts`, `lib/basis-url.test.ts`, `app/auth/bestaetigen/route.ts`
- Modify: `lib/routen.ts`, `lib/routen.test.ts`

**Interfaces:**
- Produces: `basisUrl(host: string | null, proto: string | null): string`; `bestaetigungsLink(basis: string, tokenHash: string, typ: LinkTyp): string`; aus `lib/routen`: `type LinkTyp = "invite" | "recovery"`, `linkTyp(wert: string | null): LinkTyp | null`, `LOGIN_HINWEISE: Record<string, string>`, `loginHinweis(grund: string | null): string | null`, `PASSWORT_SETZEN_PFAD = "/passwort-setzen"`. `loginZielNachAbmelden` bleibt unverändert.

- [ ] **Step 1: Failing tests** — `lib/basis-url.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { basisUrl, bestaetigungsLink } from "./basis-url"

describe("basisUrl", () => {
  it("übernimmt erlaubte Hosts", () => {
    expect(basisUrl("immoheart.vercel.app", "https")).toBe("https://immoheart.vercel.app")
    expect(basisUrl("immoheart-git-feature-n2-konten-davides-projects-e3ca110b.vercel.app", "https")).toBe(
      "https://immoheart-git-feature-n2-konten-davides-projects-e3ca110b.vercel.app"
    )
    expect(basisUrl("localhost:3000", "http")).toBe("http://localhost:3000")
  })

  it("fällt bei fremden oder fehlenden Hosts auf Production zurück", () => {
    expect(basisUrl("evil.example.com", "https")).toBe("https://immoheart.vercel.app")
    expect(basisUrl("immoheart.vercel.app.evil.com", "https")).toBe("https://immoheart.vercel.app")
    expect(basisUrl("immoheart-x-other-team.vercel.app", "https")).toBe("https://immoheart.vercel.app")
    expect(basisUrl(null, null)).toBe("https://immoheart.vercel.app")
  })

  it("erzwingt https ausser für localhost", () => {
    expect(basisUrl("immoheart.vercel.app", "http")).toBe("https://immoheart.vercel.app")
  })
})

describe("bestaetigungsLink", () => {
  it("baut den Link mit kodiertem Token", () => {
    expect(bestaetigungsLink("https://immoheart.vercel.app", "a b&c", "invite")).toBe(
      "https://immoheart.vercel.app/auth/bestaetigen?token_hash=a%20b%26c&typ=invite"
    )
  })
})
```

In `lib/routen.test.ts` ergänzen:

```ts
import { linkTyp, loginHinweis } from "./routen"

describe("linkTyp", () => {
  it("akzeptiert nur invite und recovery exakt", () => {
    expect(linkTyp("invite")).toBe("invite")
    expect(linkTyp("recovery")).toBe("recovery")
    expect(linkTyp("INVITE")).toBeNull()
    expect(linkTyp("signup")).toBeNull()
    expect(linkTyp(null)).toBeNull()
  })
})

describe("loginHinweis", () => {
  it("liefert nur feste Texte für bekannte Gründe", () => {
    expect(loginHinweis("inaktiv")).toBe("Dieses Konto ist deaktiviert.")
    expect(loginHinweis("link-ungueltig")).toBe("Der Link ist ungültig oder abgelaufen.")
    expect(loginHinweis("passwort-gesetzt")).toBe("Passwort gespeichert. Bitte melden Sie sich an.")
    expect(loginHinweis("<script>")).toBeNull()
    expect(loginHinweis("toString")).toBeNull()
    expect(loginHinweis(null)).toBeNull()
  })
})
```

(Den bestehenden Import in `lib/routen.test.ts` zu einer Zeile zusammenführen.)

- [ ] **Step 2: Run** `npx vitest run lib/basis-url.test.ts lib/routen.test.ts` — Expected: FAIL (fehlende Exporte).

- [ ] **Step 3: `lib/basis-url.ts`**

```ts
import type { LinkTyp } from "./routen"

const PRODUCTION = "https://immoheart.vercel.app"
// Einladungs- und Reset-Links zeigen auf die Umgebung, aus der sie ausgelöst
// wurden (Preview testet Preview). Der Host kommt aus dem Request-Header und ist
// damit vom Aufrufer beeinflussbar -- nur bekannte Hosts werden übernommen,
// sonst könnte ein manipulierter Host-Header Links auf eine fremde Domain erzeugen.
const ERLAUBTE_HOSTS = [
  /^localhost(:\d+)?$/,
  /^immoheart\.vercel\.app$/,
  /^immoheart-[a-z0-9-]+-davides-projects-e3ca110b\.vercel\.app$/,
]

export function basisUrl(host: string | null, proto: string | null): string {
  if (!host || !ERLAUBTE_HOSTS.some((muster) => muster.test(host))) return PRODUCTION
  const istLokal = host.startsWith("localhost")
  return `${istLokal && proto === "http" ? "http" : "https"}://${host}`
}

export function bestaetigungsLink(basis: string, tokenHash: string, typ: LinkTyp): string {
  return `${basis}/auth/bestaetigen?token_hash=${encodeURIComponent(tokenHash)}&typ=${typ}`
}
```

- [ ] **Step 4: `lib/routen.ts` ergänzen** (unter den bestehenden Exporten):

```ts
export const PASSWORT_SETZEN_PFAD = "/passwort-setzen"

export type LinkTyp = "invite" | "recovery"

export function linkTyp(wert: string | null): LinkTyp | null {
  return wert === "invite" || wert === "recovery" ? wert : null
}

// Feste Texte statt Query-Inhalt: /login zeigt nie, was in der URL steht.
// Object.hasOwn statt `in`, damit "toString" & Co. nicht als Schlüssel gelten.
export const LOGIN_HINWEISE: Record<string, string> = {
  inaktiv: "Dieses Konto ist deaktiviert.",
  "link-ungueltig": "Der Link ist ungültig oder abgelaufen.",
  "passwort-gesetzt": "Passwort gespeichert. Bitte melden Sie sich an.",
}

export function loginHinweis(grund: string | null): string | null {
  if (grund === null || !Object.hasOwn(LOGIN_HINWEISE, grund)) return null
  return LOGIN_HINWEISE[grund] ?? null
}
```

- [ ] **Step 5: Run** `npx vitest run lib/basis-url.test.ts lib/routen.test.ts` — Expected: PASS.

- [ ] **Step 6: `app/auth/bestaetigen/route.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server"
import { erstelleServerClient } from "@/lib/supabase/server"
import { LOGIN_PFAD, PASSWORT_SETZEN_PFAD, linkTyp } from "@/lib/routen"

// Löst den Token aus Einladungs- oder Reset-Mail ein. verifyOtp setzt die
// Session-Cookies, danach legt der Nutzer auf /passwort-setzen sein Passwort fest.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get("token_hash")
  const typ = linkTyp(url.searchParams.get("typ"))
  if (!tokenHash || !typ) {
    return NextResponse.redirect(new URL(`${LOGIN_PFAD}?grund=link-ungueltig`, request.url), 303)
  }

  const supabase = await erstelleServerClient()
  const { error } = await supabase.auth.verifyOtp({ type: typ, token_hash: tokenHash })
  if (error) {
    return NextResponse.redirect(new URL(`${LOGIN_PFAD}?grund=link-ungueltig`, request.url), 303)
  }
  return NextResponse.redirect(new URL(PASSWORT_SETZEN_PFAD, request.url), 303)
}
```

- [ ] **Step 7: Prüfen + Commit**

```bash
npm run lint && npx tsc --noEmit && npm run test
git add lib/basis-url.ts lib/basis-url.test.ts lib/routen.ts lib/routen.test.ts app/auth/bestaetigen/route.ts
git commit -m "feat: Bestaetigungslinks mit Host-Allowlist und Token-Route"
```

---

### Task 4: Passwort setzen, Passwort vergessen, Login-Hinweise

**Files:**
- Create: `app/(auth)/passwort-setzen/page.tsx`, `components/auth/PasswortSetzenFormular.tsx`, `app/(auth)/passwort-vergessen/page.tsx`, `components/auth/PasswortVergessenFormular.tsx`, `app/actions/passwort.ts`
- Modify: `app/(auth)/login/page.tsx`, `middleware.ts`

**Interfaces:**
- Consumes: `erstelleAdminClient`, `passwortResetMail`, `sendeMail`, `basisUrl`, `bestaetigungsLink`, `loginHinweis`, `PASSWORT_SETZEN_PFAD`.
- Produces: `passwortVergessen(email: string): Promise<void>` (Server Action, wirft nie wegen unbekannter E-Mail).

- [ ] **Step 1: `app/(auth)/passwort-setzen/page.tsx`** (Server Component, braucht Session aus `/auth/bestaetigen`)

```tsx
import { redirect } from "next/navigation"
import { erstelleServerClient } from "@/lib/supabase/server"
import { PasswortSetzenFormular } from "@/components/auth/PasswortSetzenFormular"

export default async function PasswortSetzenSeite() {
  const supabase = await erstelleServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?grund=link-ungueltig")

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <PasswortSetzenFormular email={user.email ?? ""} />
    </main>
  )
}
```

- [ ] **Step 2: `components/auth/PasswortSetzenFormular.tsx`**

```tsx
"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { erstelleBrowserClient } from "@/lib/supabase/client"

const MINDESTLAENGE = 8

export function PasswortSetzenFormular({ email }: { email: string }) {
  const router = useRouter()
  const [passwort, setPasswort] = useState("")
  const [wiederholung, setWiederholung] = useState("")
  const [fehler, setFehler] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(false)

  async function speichern(ereignis: FormEvent) {
    ereignis.preventDefault()
    if (laedt) return
    if (passwort.length < MINDESTLAENGE) return setFehler(`Mindestens ${MINDESTLAENGE} Zeichen.`)
    if (passwort !== wiederholung) return setFehler("Die Passwörter stimmen nicht überein.")
    setLaedt(true)
    setFehler(null)
    const supabase = erstelleBrowserClient()
    const { error } = await supabase.auth.updateUser({ password: passwort })
    setLaedt(false)
    if (error) return setFehler("Passwort konnte nicht gespeichert werden.")
    router.push("/admin")
    router.refresh()
  }

  return (
    <form onSubmit={speichern} className="flex w-full max-w-sm flex-col gap-3 rounded-card border border-line bg-surface p-6">
      <h1 className="font-display text-xl font-bold text-ink">Passwort festlegen</h1>
      <p className="text-sm text-ink-2">{email}</p>
      <input
        type="password"
        required
        autoComplete="new-password"
        placeholder="Neues Passwort"
        value={passwort}
        onChange={(e) => setPasswort(e.target.value)}
        className="rounded-lg border border-line-2 px-3 py-2 text-sm text-ink"
      />
      <input
        type="password"
        required
        autoComplete="new-password"
        placeholder="Passwort wiederholen"
        value={wiederholung}
        onChange={(e) => setWiederholung(e.target.value)}
        className="rounded-lg border border-line-2 px-3 py-2 text-sm text-ink"
      />
      {fehler && <p className="text-sm text-crit">{fehler}</p>}
      <button type="submit" disabled={laedt} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-on-brand disabled:opacity-60">
        {laedt ? "…" : "Passwort speichern"}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: `app/actions/passwort.ts`**

```ts
"use server"

import { headers } from "next/headers"
import { z } from "zod"
import { erstelleAdminClient } from "@/lib/supabase/admin"
import { passwortResetMail } from "@/lib/mail/vorlagen"
import { sendeMail } from "@/lib/mail/versand"
import { basisUrl, bestaetigungsLink } from "@/lib/basis-url"

const eingabe = z.object({ email: z.email().max(254) })

// Gibt bewusst nie preis, ob ein Konto existiert: gleiche Rückkehr (kein Fehler)
// bei unbekannter, deaktivierter oder ungültiger Adresse. Nur aktive Konten
// bekommen eine Mail; Fehler beim Versand werden geloggt, nicht gemeldet.
export async function passwortVergessen(email: string): Promise<void> {
  const geprueft = eingabe.safeParse({ email: email.trim().toLowerCase() })
  if (!geprueft.success) return

  const admin = erstelleAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: geprueft.data.email })
  if (error || !data.user) return

  const { data: profil } = await admin.from("profiles").select("aktiv").eq("user_id", data.user.id).maybeSingle()
  if (!profil?.aktiv) return

  const kopf = await headers()
  const link = bestaetigungsLink(
    basisUrl(kopf.get("x-forwarded-host") ?? kopf.get("host"), kopf.get("x-forwarded-proto")),
    data.properties.hashed_token,
    "recovery"
  )
  try {
    await sendeMail(geprueft.data.email, passwortResetMail(link))
  } catch (fehler) {
    console.error("passwortVergessen: Versand fehlgeschlagen", fehler)
  }
}
```

Hinweis: `generateLink({ type: "recovery" })` für eine unbekannte Adresse liefert einen Fehler — das ist der gewünschte stille Abbruch.

- [ ] **Step 4: `components/auth/PasswortVergessenFormular.tsx`**

```tsx
"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { passwortVergessen } from "@/app/actions/passwort"

export function PasswortVergessenFormular() {
  const [email, setEmail] = useState("")
  const [gesendet, setGesendet] = useState(false)
  const [laedt, setLaedt] = useState(false)

  async function absenden(ereignis: FormEvent) {
    ereignis.preventDefault()
    if (laedt) return
    setLaedt(true)
    await passwortVergessen(email)
    setLaedt(false)
    setGesendet(true)
  }

  return (
    <form onSubmit={absenden} className="flex w-full max-w-sm flex-col gap-3 rounded-card border border-line bg-surface p-6">
      <h1 className="font-display text-xl font-bold text-ink">Passwort vergessen</h1>
      {gesendet ? (
        <p className="text-sm text-ink-2">Falls ein aktives Konto zu dieser Adresse existiert, ist eine Mail unterwegs.</p>
      ) : (
        <>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-line-2 px-3 py-2 text-sm text-ink"
          />
          <button type="submit" disabled={laedt} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-on-brand disabled:opacity-60">
            {laedt ? "…" : "Link senden"}
          </button>
        </>
      )}
      <Link href="/login" className="text-center text-sm text-ink-2 hover:text-brand">
        ← Zum Login
      </Link>
    </form>
  )
}
```

`app/(auth)/passwort-vergessen/page.tsx`:

```tsx
import { PasswortVergessenFormular } from "@/components/auth/PasswortVergessenFormular"

export default function PasswortVergessenSeite() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <PasswortVergessenFormular />
    </main>
  )
}
```

- [ ] **Step 5: Login-Seite** — in `app/(auth)/login/page.tsx`:
  1. Komponente `KontoDeaktiviertHinweis` ersetzen durch:

```tsx
function LoginHinweis() {
  const hinweis = loginHinweis(useSearchParams().get("grund"))
  if (!hinweis) return null
  return <p className="text-sm text-ink-2">{hinweis}</p>
}
```

  (Import `loginHinweis` aus `@/lib/routen`; Kommentar über der Komponente beibehalten; im JSX `<LoginHinweis />` statt `<KontoDeaktiviertHinweis />`.)
  2. Unter dem Anmelden-Knopf, vor „← Zur Website“:

```tsx
<Link href="/passwort-vergessen" className="text-center text-sm text-ink-2 hover:text-brand">
  Passwort vergessen?
</Link>
```

- [ ] **Step 6: Middleware** — `config.matcher` wird `["/admin/:path*", "/login", "/passwort-setzen"]` (Session-Refresh auch dort; `/passwort-setzen` wird weder geschützt noch umgeleitet, weil `istAdminPfad` false und Pfad ≠ `/login`). Kommentar darüber entsprechend um „und /passwort-setzen“ ergänzen.

- [ ] **Step 7: Prüfen + Commit**

```bash
npm run lint && npx tsc --noEmit && npm run test && npm run build
git add -A
git commit -m "feat: Passwort setzen und vergessen, Login-Hinweise"
```

---

### Task 5: Nutzer-Regeln (TDD), Konten-Abfrage, Nutzer-Actions

**Files:**
- Create: `lib/nutzer-regeln.ts`, `lib/nutzer-regeln.test.ts`, `lib/queries/nutzer.ts`, `app/actions/nutzer.ts`
- Modify: `lib/queries/profile.ts`

**Interfaces:**
- Produces:
  - `neuesKontoSchema` (zod: `name` 1–80 Zeichen getrimmt, `email` gültig, klein, max 254, `darfNutzerAnlegen` boolean)
  - `type KontoStatus = "eingeladen" | "aktiv" | "deaktiviert"`, `kontoStatus(aktiv: boolean, letzteAnmeldung: string | null): KontoStatus`
  - `deaktivierenVerboten(p: { zielUserId: string; eigeneUserId: string; zielHatRecht: boolean; aktiveMitRecht: number }): string | null`
  - `rechtEntzugVerboten(p: { zielUserId: string; eigeneUserId: string; aktiveMitRecht: number; zielIstAktiv: boolean }): string | null`
  - `type Konto = { userId: string; name: string; email: string; darfNutzerAnlegen: boolean; status: KontoStatus }`, `holeKonten(): Promise<Konto[]>`
  - `holeBerechtigtesProfil(): Promise<Profil>` (wirft `"Keine Berechtigung"`)
  - Actions: `kontoAnlegen(eingabe: { name: string; email: string; darfNutzerAnlegen: boolean }): Promise<{ hinweis: string | null }>`, `setzeNutzerRecht(userId: string, wert: boolean): Promise<void>`, `kontoDeaktivieren(userId: string): Promise<void>`, `kontoReaktivieren(userId: string): Promise<void>`, `einladungErneutSenden(userId: string): Promise<void>`

- [ ] **Step 1: Failing tests** — `lib/nutzer-regeln.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { deaktivierenVerboten, kontoStatus, neuesKontoSchema, rechtEntzugVerboten } from "./nutzer-regeln"

describe("neuesKontoSchema", () => {
  it("normalisiert und akzeptiert gültige Eingaben", () => {
    const r = neuesKontoSchema.parse({ name: "  Anna  ", email: " Anna@Example.CH ", darfNutzerAnlegen: false })
    expect(r).toEqual({ name: "Anna", email: "anna@example.ch", darfNutzerAnlegen: false })
  })
  it("lehnt leere Namen und ungültige Adressen ab", () => {
    expect(neuesKontoSchema.safeParse({ name: " ", email: "a@b.ch", darfNutzerAnlegen: true }).success).toBe(false)
    expect(neuesKontoSchema.safeParse({ name: "A", email: "kein-mail", darfNutzerAnlegen: true }).success).toBe(false)
    expect(neuesKontoSchema.safeParse({ name: "x".repeat(81), email: "a@b.ch", darfNutzerAnlegen: true }).success).toBe(false)
  })
})

describe("kontoStatus", () => {
  it("unterscheidet deaktiviert, eingeladen und aktiv", () => {
    expect(kontoStatus(false, "2026-09-01T00:00:00Z")).toBe("deaktiviert")
    expect(kontoStatus(true, null)).toBe("eingeladen")
    expect(kontoStatus(true, "2026-09-01T00:00:00Z")).toBe("aktiv")
  })
})

describe("deaktivierenVerboten", () => {
  it("verbietet das eigene Konto", () => {
    expect(deaktivierenVerboten({ zielUserId: "a", eigeneUserId: "a", zielHatRecht: false, aktiveMitRecht: 3 })).toBe(
      "Das eigene Konto kann nicht deaktiviert werden."
    )
  })
  it("verbietet das letzte aktive Konto mit Recht", () => {
    expect(deaktivierenVerboten({ zielUserId: "b", eigeneUserId: "a", zielHatRecht: true, aktiveMitRecht: 1 })).toBe(
      "Das letzte Konto mit Recht zur Nutzerverwaltung kann nicht deaktiviert werden."
    )
  })
  it("erlaubt sonst", () => {
    expect(deaktivierenVerboten({ zielUserId: "b", eigeneUserId: "a", zielHatRecht: true, aktiveMitRecht: 2 })).toBeNull()
    expect(deaktivierenVerboten({ zielUserId: "b", eigeneUserId: "a", zielHatRecht: false, aktiveMitRecht: 1 })).toBeNull()
  })
})

describe("rechtEntzugVerboten", () => {
  it("verbietet, sich selbst das Recht zu entziehen", () => {
    expect(rechtEntzugVerboten({ zielUserId: "a", eigeneUserId: "a", aktiveMitRecht: 3, zielIstAktiv: true })).toBe(
      "Das eigene Recht kann nicht entzogen werden."
    )
  })
  it("verbietet, dem letzten aktiven Konto das Recht zu entziehen", () => {
    expect(rechtEntzugVerboten({ zielUserId: "b", eigeneUserId: "a", aktiveMitRecht: 1, zielIstAktiv: true })).toBe(
      "Das letzte Konto mit Recht zur Nutzerverwaltung behält das Recht."
    )
  })
  it("erlaubt bei inaktivem Ziel oder mehreren", () => {
    expect(rechtEntzugVerboten({ zielUserId: "b", eigeneUserId: "a", aktiveMitRecht: 1, zielIstAktiv: false })).toBeNull()
    expect(rechtEntzugVerboten({ zielUserId: "b", eigeneUserId: "a", aktiveMitRecht: 2, zielIstAktiv: true })).toBeNull()
  })
})
```

- [ ] **Step 2: Run** `npx vitest run lib/nutzer-regeln.test.ts` — Expected: FAIL.

- [ ] **Step 3: `lib/nutzer-regeln.ts`**

```ts
import { z } from "zod"

export const neuesKontoSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  darfNutzerAnlegen: z.boolean(),
})

export type KontoStatus = "eingeladen" | "aktiv" | "deaktiviert"

export function kontoStatus(aktiv: boolean, letzteAnmeldung: string | null): KontoStatus {
  if (!aktiv) return "deaktiviert"
  return letzteAnmeldung ? "aktiv" : "eingeladen"
}

export function deaktivierenVerboten(p: {
  zielUserId: string
  eigeneUserId: string
  zielHatRecht: boolean
  aktiveMitRecht: number
}): string | null {
  if (p.zielUserId === p.eigeneUserId) return "Das eigene Konto kann nicht deaktiviert werden."
  if (p.zielHatRecht && p.aktiveMitRecht <= 1) {
    return "Das letzte Konto mit Recht zur Nutzerverwaltung kann nicht deaktiviert werden."
  }
  return null
}

export function rechtEntzugVerboten(p: {
  zielUserId: string
  eigeneUserId: string
  aktiveMitRecht: number
  zielIstAktiv: boolean
}): string | null {
  if (p.zielUserId === p.eigeneUserId) return "Das eigene Recht kann nicht entzogen werden."
  if (p.zielIstAktiv && p.aktiveMitRecht <= 1) return "Das letzte Konto mit Recht zur Nutzerverwaltung behält das Recht."
  return null
}
```

- [ ] **Step 4: Run** `npx vitest run lib/nutzer-regeln.test.ts` — Expected: PASS.

- [ ] **Step 5: `lib/queries/profile.ts`** — ergänzen:

```ts
export async function holeBerechtigtesProfil(): Promise<Profil> {
  const profil = await holeEigenesProfil()
  if (!profil.darf_nutzer_anlegen) throw new Error("Keine Berechtigung")
  return profil
}
```

- [ ] **Step 6: `lib/queries/nutzer.ts`**

```ts
import "server-only"
import { erstelleAdminClient } from "@/lib/supabase/admin"
import { kontoStatus, type KontoStatus } from "@/lib/nutzer-regeln"

export type Konto = { userId: string; name: string; email: string; darfNutzerAnlegen: boolean; status: KontoStatus }

// Auth-Daten (E-Mail, letzte Anmeldung) und Profile liegen getrennt; der
// Admin-Client liest beide. Aufrufer müssen vorher holeBerechtigtesProfil() prüfen.
export async function holeKonten(): Promise<Konto[]> {
  const admin = erstelleAdminClient()
  const [{ data: authDaten, error: authFehler }, { data: profile, error: profilFehler }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    admin.from("profiles").select("user_id, name, aktiv, darf_nutzer_anlegen"),
  ])
  if (authFehler) throw authFehler
  if (profilFehler) throw profilFehler

  const profilNachUser = new Map(profile.map((p) => [p.user_id, p]))
  return authDaten.users
    .flatMap((u) => {
      const p = profilNachUser.get(u.id)
      if (!p) return []
      return [
        {
          userId: u.id,
          name: p.name,
          email: u.email ?? "",
          darfNutzerAnlegen: p.darf_nutzer_anlegen,
          status: kontoStatus(p.aktiv, u.last_sign_in_at ?? null),
        },
      ]
    })
    .sort((a, b) => a.name.localeCompare(b.name, "de"))
}

export async function zaehleAktiveMitRecht(): Promise<number> {
  const admin = erstelleAdminClient()
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("aktiv", true)
    .eq("darf_nutzer_anlegen", true)
  if (error) throw error
  return count ?? 0
}
```

- [ ] **Step 7: `app/actions/nutzer.ts`**

```ts
"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"
import { erstelleAdminClient } from "@/lib/supabase/admin"
import { holeBerechtigtesProfil } from "@/lib/queries/profile"
import { zaehleAktiveMitRecht } from "@/lib/queries/nutzer"
import { deaktivierenVerboten, neuesKontoSchema, rechtEntzugVerboten } from "@/lib/nutzer-regeln"
import { einladungsMail } from "@/lib/mail/vorlagen"
import { sendeMail } from "@/lib/mail/versand"
import { basisUrl, bestaetigungsLink } from "@/lib/basis-url"

const userIdSchema = z.uuid()
const DAUERHAFT_GESPERRT = "876000h"

async function linkBasis(): Promise<string> {
  const kopf = await headers()
  return basisUrl(kopf.get("x-forwarded-host") ?? kopf.get("host"), kopf.get("x-forwarded-proto"))
}

async function holeZielprofil(userId: string) {
  const admin = erstelleAdminClient()
  const { data, error } = await admin.from("profiles").select("*").eq("user_id", userId).maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Konto nicht gefunden")
  return data
}

export async function kontoAnlegen(eingabe: {
  name: string
  email: string
  darfNutzerAnlegen: boolean
}): Promise<{ hinweis: string | null }> {
  await holeBerechtigtesProfil()
  const geprueft = neuesKontoSchema.safeParse(eingabe)
  if (!geprueft.success) throw new Error("Bitte Name und gültige E-Mail angeben.")
  const { name, email, darfNutzerAnlegen } = geprueft.data

  const admin = erstelleAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({ type: "invite", email, options: { data: { name } } })
  if (error || !data.user) throw new Error("Zu dieser E-Mail besteht bereits ein Konto oder sie ist ungültig.")

  const { error: profilFehler } = await admin
    .from("profiles")
    .insert({ user_id: data.user.id, name, aktiv: true, darf_nutzer_anlegen: darfNutzerAnlegen })
  if (profilFehler) {
    // Ohne Profil wäre das Konto unbrauchbar und die E-Mail blockiert -- zurückrollen.
    await admin.auth.admin.deleteUser(data.user.id)
    throw new Error("Konto konnte nicht angelegt werden.")
  }

  revalidatePath("/admin/nutzer")
  try {
    await sendeMail(email, einladungsMail(name, bestaetigungsLink(await linkBasis(), data.properties.hashed_token, "invite")))
    return { hinweis: null }
  } catch (fehler) {
    console.error("kontoAnlegen: Einladung nicht gesendet", fehler)
    return { hinweis: "Konto angelegt, aber die Einladung konnte nicht gesendet werden. Bitte „Einladung erneut senden“." }
  }
}

export async function setzeNutzerRecht(userId: string, wert: boolean): Promise<void> {
  const selbst = await holeBerechtigtesProfil()
  const id = userIdSchema.parse(userId)
  const ziel = await holeZielprofil(id)
  if (!wert) {
    const verbot = rechtEntzugVerboten({
      zielUserId: id,
      eigeneUserId: selbst.user_id,
      aktiveMitRecht: await zaehleAktiveMitRecht(),
      zielIstAktiv: ziel.aktiv,
    })
    if (verbot) throw new Error(verbot)
  }
  const { error } = await erstelleAdminClient().from("profiles").update({ darf_nutzer_anlegen: wert }).eq("user_id", id)
  if (error) throw error
  revalidatePath("/admin/nutzer")
}

export async function kontoDeaktivieren(userId: string): Promise<void> {
  const selbst = await holeBerechtigtesProfil()
  const id = userIdSchema.parse(userId)
  const ziel = await holeZielprofil(id)
  const verbot = deaktivierenVerboten({
    zielUserId: id,
    eigeneUserId: selbst.user_id,
    zielHatRecht: ziel.darf_nutzer_anlegen && ziel.aktiv,
    aktiveMitRecht: await zaehleAktiveMitRecht(),
  })
  if (verbot) throw new Error(verbot)

  const admin = erstelleAdminClient()
  const { error } = await admin.from("profiles").update({ aktiv: false }).eq("user_id", id)
  if (error) throw error
  // Sperre auf Auth-Ebene zusätzlich zu aktiv=false: verhindert neue Anmeldungen
  // und Token-Erneuerung, nicht nur den Zugriff auf /admin.
  const { error: sperrFehler } = await admin.auth.admin.updateUserById(id, { ban_duration: DAUERHAFT_GESPERRT })
  if (sperrFehler) throw sperrFehler
  revalidatePath("/admin/nutzer")
}

export async function kontoReaktivieren(userId: string): Promise<void> {
  await holeBerechtigtesProfil()
  const id = userIdSchema.parse(userId)
  await holeZielprofil(id)
  const admin = erstelleAdminClient()
  const { error: sperrFehler } = await admin.auth.admin.updateUserById(id, { ban_duration: "none" })
  if (sperrFehler) throw sperrFehler
  const { error } = await admin.from("profiles").update({ aktiv: true }).eq("user_id", id)
  if (error) throw error
  revalidatePath("/admin/nutzer")
}

export async function einladungErneutSenden(userId: string): Promise<void> {
  await holeBerechtigtesProfil()
  const id = userIdSchema.parse(userId)
  const ziel = await holeZielprofil(id)
  if (!ziel.aktiv) throw new Error("Deaktivierte Konten erhalten keine Einladung.")

  const admin = erstelleAdminClient()
  const { data: nutzer, error: nutzerFehler } = await admin.auth.admin.getUserById(id)
  if (nutzerFehler || !nutzer.user.email) throw new Error("Konto nicht gefunden")
  // recovery statt invite: funktioniert auch für bereits bestehende Auth-Nutzer
  // und führt über denselben Weg zu /passwort-setzen.
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: nutzer.user.email })
  if (error) throw error
  await sendeMail(
    nutzer.user.email,
    einladungsMail(ziel.name, bestaetigungsLink(await linkBasis(), data.properties.hashed_token, "recovery"))
  )
}
```

- [ ] **Step 8: Prüfen + Commit**

```bash
npm run lint && npx tsc --noEmit && npm run test && npm run build
git add -A
git commit -m "feat: Nutzerverwaltung serverseitig (Regeln, Abfrage, Actions)"
```

---

### Task 6: Oberfläche `/admin/nutzer` und Seitenleiste

**Files:**
- Create: `app/admin/nutzer/page.tsx`, `components/nutzer/NutzerListe.tsx`, `components/nutzer/NeuesKontoFormular.tsx`
- Modify: `components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `holeEigenesProfil`, `holeKonten`, `Konto`, Actions aus Task 5, `Header`, `Button`, shadcn `Badge`, `sonner` `toast`.

- [ ] **Step 1: `app/admin/nutzer/page.tsx`**

```tsx
import { notFound } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { NutzerListe } from "@/components/nutzer/NutzerListe"
import { NeuesKontoFormular } from "@/components/nutzer/NeuesKontoFormular"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { holeKonten } from "@/lib/queries/nutzer"

export default async function NutzerSeite() {
  const profil = await holeEigenesProfil()
  // 404 statt Hinweis: Konten ohne Recht sollen die Seite gar nicht als vorhanden erleben.
  if (!profil.darf_nutzer_anlegen) notFound()
  const konten = await holeKonten()

  return (
    <>
      <Header titel="Nutzer" untertitel={`${konten.length} Konten`} />
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-5 lg:flex-row lg:items-start">
        <NutzerListe konten={konten} eigeneUserId={profil.user_id} />
        <NeuesKontoFormular />
      </main>
    </>
  )
}
```

- [ ] **Step 2: `components/nutzer/NutzerListe.tsx`**

```tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/shadcn/badge"
import { Button } from "@/components/ui/Button"
import type { Konto } from "@/lib/queries/nutzer"
import { einladungErneutSenden, kontoDeaktivieren, kontoReaktivieren, setzeNutzerRecht } from "@/app/actions/nutzer"

const STATUS_TEXT: Record<Konto["status"], string> = { eingeladen: "eingeladen", aktiv: "aktiv", deaktiviert: "deaktiviert" }

export function NutzerListe({ konten, eigeneUserId }: { konten: Konto[]; eigeneUserId: string }) {
  const [laufend, setLaufend] = useState<string | null>(null)

  async function ausfuehren(userId: string, aktion: () => Promise<void>, erfolg: string) {
    setLaufend(userId)
    try {
      await aktion()
      toast.success(erfolg)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aktion fehlgeschlagen")
    } finally {
      setLaufend(null)
    }
  }

  return (
    <div className="flex-1 rounded-card border border-line bg-surface">
      {konten.map((k) => {
        const selbst = k.userId === eigeneUserId
        const sperre = laufend !== null
        return (
          <div key={k.userId} className="flex flex-wrap items-center gap-3 border-b border-line p-3.5 last:border-b-0">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-ink">
                {k.name} {selbst && <span className="text-xs text-ink-3">(Sie)</span>}
              </div>
              <div className="truncate text-xs text-ink-3">{k.email}</div>
            </div>
            <Badge variant={k.status === "deaktiviert" ? "secondary" : "outline"}>{STATUS_TEXT[k.status]}</Badge>
            <label className="flex items-center gap-1.5 text-xs text-ink-2">
              <input
                type="checkbox"
                checked={k.darfNutzerAnlegen}
                disabled={sperre || selbst}
                onChange={(e) => void ausfuehren(k.userId, () => setzeNutzerRecht(k.userId, e.target.checked), "Recht gespeichert")}
              />
              darf Nutzer anlegen
            </label>
            {k.status === "eingeladen" && (
              <Button disabled={sperre} onClick={() => void ausfuehren(k.userId, () => einladungErneutSenden(k.userId), "Einladung gesendet")}>
                Einladung erneut
              </Button>
            )}
            {!selbst &&
              (k.status === "deaktiviert" ? (
                <Button disabled={sperre} onClick={() => void ausfuehren(k.userId, () => kontoReaktivieren(k.userId), "Konto reaktiviert")}>
                  Reaktivieren
                </Button>
              ) : (
                <Button disabled={sperre} onClick={() => void ausfuehren(k.userId, () => kontoDeaktivieren(k.userId), "Konto deaktiviert")}>
                  Deaktivieren
                </Button>
              ))}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: `components/nutzer/NeuesKontoFormular.tsx`**

```tsx
"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { kontoAnlegen } from "@/app/actions/nutzer"

export function NeuesKontoFormular() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [darfNutzerAnlegen, setDarfNutzerAnlegen] = useState(false)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function absenden(ereignis: FormEvent) {
    ereignis.preventDefault()
    if (laedt) return
    setLaedt(true)
    setFehler(null)
    try {
      const { hinweis } = await kontoAnlegen({ name, email, darfNutzerAnlegen })
      if (hinweis) toast.warning(hinweis)
      else toast.success(`Einladung an ${email} gesendet`)
      setName("")
      setEmail("")
      setDarfNutzerAnlegen(false)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Konto konnte nicht angelegt werden.")
    } finally {
      setLaedt(false)
    }
  }

  return (
    <form onSubmit={absenden} className="flex w-full flex-col gap-3 rounded-card border border-line bg-surface p-4 lg:w-80">
      <h2 className="font-display text-base font-bold text-ink">Neues Konto</h2>
      <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-line-2 px-3 py-2 text-sm text-ink" />
      <input required type="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border border-line-2 px-3 py-2 text-sm text-ink" />
      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" checked={darfNutzerAnlegen} onChange={(e) => setDarfNutzerAnlegen(e.target.checked)} />
        darf ebenfalls Nutzer anlegen
      </label>
      {fehler && <p className="text-sm text-crit">{fehler}</p>}
      <button type="submit" disabled={laedt} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-on-brand disabled:opacity-60">
        {laedt ? "…" : "Einladen"}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Seitenleiste** — in `components/layout/Sidebar.tsx`:
  1. Import um `Users, UserCircle` aus `lucide-react` ergänzen.
  2. Innerhalb der Komponente: `const eintraege = profil.darf_nutzer_anlegen ? [...EINTRAEGE, { pfad: "/admin/nutzer", label: "Nutzer", Icon: Users }] : EINTRAEGE` und in der Navigation `eintraege.map(...)` statt `EINTRAEGE.map(...)`.
  3. Den unteren Namensblock (`<div className="flex items-center gap-2.5 border-t …">`) in einen `<Link href="/admin/profil" …>` mit denselben Klassen plus `hover:bg-surface-2` umwandeln (Initialen-Kreis und Name bleiben).

- [ ] **Step 5: Prüfen + Commit**

```bash
npm run lint && npx tsc --noEmit && npm run test && npm run build
git add -A
git commit -m "feat: Seite Nutzerverwaltung und Eintrag in der Seitenleiste"
```

---

### Task 7: Profilseite (Name, Passwort)

**Files:**
- Create: `app/admin/profil/page.tsx`, `components/profil/ProfilFormular.tsx`, `app/actions/profil.ts`

**Interfaces:**
- Produces: `nameAendern(name: string): Promise<void>` (Server Action, ändert nur das eigene Profil).

- [ ] **Step 1: `app/actions/profil.ts`**

```ts
"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { erstelleAdminClient } from "@/lib/supabase/admin"
import { holeEigenesProfil } from "@/lib/queries/profile"

const nameSchema = z.string().trim().min(1).max(80)

// Eingeloggte Nutzer haben kein Update-Recht auf profiles (Migration N2) -- der
// Name wird nach Prüfung des eigenen, aktiven Profils mit dem Admin-Client gesetzt,
// ausschliesslich für die eigene user_id.
export async function nameAendern(name: string): Promise<void> {
  const profil = await holeEigenesProfil()
  const geprueft = nameSchema.safeParse(name)
  if (!geprueft.success) throw new Error("Bitte einen Namen angeben (max. 80 Zeichen).")
  const { error } = await erstelleAdminClient().from("profiles").update({ name: geprueft.data }).eq("user_id", profil.user_id)
  if (error) throw error
  revalidatePath("/admin", "layout")
}
```

- [ ] **Step 2: `components/profil/ProfilFormular.tsx`**

```tsx
"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { nameAendern } from "@/app/actions/profil"
import { erstelleBrowserClient } from "@/lib/supabase/client"

const MINDESTLAENGE = 8
const FELD = "rounded-lg border border-line-2 px-3 py-2 text-sm text-ink"
const KNOPF = "rounded-lg bg-brand px-3 py-2 text-sm font-medium text-on-brand disabled:opacity-60"

export function ProfilFormular({ name: startName, email }: { name: string; email: string }) {
  const [name, setName] = useState(startName)
  const [passwort, setPasswort] = useState("")
  const [wiederholung, setWiederholung] = useState("")
  const [laedt, setLaedt] = useState<"name" | "passwort" | null>(null)

  async function nameSpeichern(ereignis: FormEvent) {
    ereignis.preventDefault()
    setLaedt("name")
    try {
      await nameAendern(name)
      toast.success("Name gespeichert")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Name konnte nicht gespeichert werden")
    } finally {
      setLaedt(null)
    }
  }

  async function passwortSpeichern(ereignis: FormEvent) {
    ereignis.preventDefault()
    if (passwort.length < MINDESTLAENGE) return void toast.error(`Mindestens ${MINDESTLAENGE} Zeichen.`)
    if (passwort !== wiederholung) return void toast.error("Die Passwörter stimmen nicht überein.")
    setLaedt("passwort")
    const { error } = await erstelleBrowserClient().auth.updateUser({ password: passwort })
    setLaedt(null)
    if (error) return void toast.error("Passwort konnte nicht gespeichert werden.")
    setPasswort("")
    setWiederholung("")
    toast.success("Passwort geändert")
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <form onSubmit={nameSpeichern} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
        <h2 className="font-display text-base font-bold text-ink">Profil</h2>
        <p className="text-sm text-ink-2">{email}</p>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={FELD} />
        <button type="submit" disabled={laedt !== null} className={KNOPF}>{laedt === "name" ? "…" : "Name speichern"}</button>
      </form>
      <form onSubmit={passwortSpeichern} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
        <h2 className="font-display text-base font-bold text-ink">Passwort ändern</h2>
        <input type="password" autoComplete="new-password" placeholder="Neues Passwort" value={passwort} onChange={(e) => setPasswort(e.target.value)} className={FELD} />
        <input type="password" autoComplete="new-password" placeholder="Wiederholen" value={wiederholung} onChange={(e) => setWiederholung(e.target.value)} className={FELD} />
        <button type="submit" disabled={laedt !== null} className={KNOPF}>{laedt === "passwort" ? "…" : "Passwort ändern"}</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: `app/admin/profil/page.tsx`**

```tsx
import { Header } from "@/components/layout/Header"
import { ProfilFormular } from "@/components/profil/ProfilFormular"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { erstelleServerClient } from "@/lib/supabase/server"

export default async function ProfilSeite() {
  const profil = await holeEigenesProfil()
  const supabase = await erstelleServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <Header titel="Profil" />
      <main className="flex-1 overflow-y-auto p-5">
        <ProfilFormular name={profil.name} email={user?.email ?? ""} />
      </main>
    </>
  )
}
```

- [ ] **Step 4: Prüfen + Commit**

```bash
npm run lint && npx tsc --noEmit && npm run test && npm run build
git add -A
git commit -m "feat: Profilseite mit Name und Passwort"
```

---

### Task 8: Gesamtprüfung lokal, Push

- [ ] **Step 1:** `npm run lint && npx tsc --noEmit && npm run test && npm run build && npm audit --omit=dev` — alles grün.
- [ ] **Step 2:** Produktionsserver (`npx next start -p 3108`) und ohne Login prüfen: `/passwort-vergessen` 200, `/passwort-setzen` → 307 auf `/login?grund=link-ungueltig`, `/auth/bestaetigen` ohne Parameter → 303 `/login?grund=link-ungueltig`, `/auth/bestaetigen?token_hash=x&typ=signup` → 303 `link-ungueltig`, `/admin/nutzer` → 307 `/login`. Server beenden.
- [ ] **Step 3:** `git push -u origin feature/n2-konten`.

---

### Task 9: Live-Test auf dem Preview (Controller + Davide), Merge

- [ ] **Step 1:** CI grün, Vercel-Preview `success`. Davide prüft, dass `GMAIL_USER` und `GMAIL_APP_PASSWORD` bei Vercel für Preview gesetzt sind.
- [ ] **Step 2:** Davide meldet sich auf dem Preview als `vermittler@immoheart.com` an.
- [ ] **Step 3: Einladung auf dem Preview (Controller im Browser):** `/admin/nutzer` → Konto „[TEST] Einladung“ mit `immoheart.business+n2einladung@gmail.com`, Haken aus. Erwartet: Toast „Einladung … gesendet“, Konto mit Status „eingeladen“. Controller liest per IMAP die neueste Mail an `+n2einladung` (nur Lesen) und prüft: Link-Host = Preview-Host, Pfad `/auth/bestaetigen`, `typ=invite`.
- [ ] **Step 4: Einladung einlösen — lokal:** Der Controller darf Passwörter nur auf localhost eintippen. Deshalb: `npm run dev` im Worktree, Davide meldet sich in Chrome auf `http://localhost:3000/login` als vermittler an und legt ein zweites Testkonto `immoheart.business+n2lokal@gmail.com` an; der Link zeigt dann auf localhost. Davide meldet sich ab; der Controller öffnet den Link (IMAP), setzt ein generiertes Testpasswort (nicht im Chat ausgeben), landet in `/admin`. Seitenleiste zeigt **kein** „Nutzer“, `/admin/nutzer` → 404. Abmelden.
- [ ] **Step 5: Deaktivieren:** Davide meldet sich wieder als vermittler an; Controller deaktiviert das Testkonto. Erwartet: Status „deaktiviert“. Login mit dem Testkonto schlägt fehl.
- [ ] **Step 6: Regeln:** Beim eigenen Konto sind Haken und Deaktivieren gesperrt.
- [ ] **Step 7: Passwort vergessen:** `/passwort-vergessen` mit `davide.nocito28@yahoo.com` (kein Konto) → gleiche Rückmeldung, keine Mail. Mit `immoheart.business+n2einladung@gmail.com` nach Reaktivierung → Mail kommt, Link führt zu `/passwort-setzen`.
- [ ] **Step 8: Echte externe Zustellung auf dem Preview:** Einladung an `davide.nocito28@yahoo.com` anlegen. Davide öffnet die Mail (Posteingang/Spam), klickt den Link, setzt selbst ein Passwort und bestätigt, dass er in `/admin` landet — danach Konto wieder löschen oder behalten, je nach Davides Wunsch.
- [ ] **Step 9: Aufräumen:** Testkonten per Admin-API löschen (`deleteUser`, Profil per Cascade); Kontrolle `select email from auth.users`.
- [ ] **Step 10:** Davides OK → Merge `feature/n2-konten` → `main`, Production prüfen (`/login` 200, `/passwort-vergessen` 200, `/admin/nutzer` ohne Login → `/login`).

## Abnahme N2

- Ein Konto mit Recht legt ein Konto an; die Einladung kommt per Gmail an, der Link führt zu `/passwort-setzen`, danach ist das neue Konto eingeloggt.
- Ohne Recht ist `/admin/nutzer` nicht erreichbar (404) und jede Nutzer-Action wirft „Keine Berechtigung“.
- Eigenes Konto / letztes Konto mit Recht: nicht deaktivierbar, Recht nicht entziehbar.
- Deaktivierte Konten können sich nicht mehr anmelden; Reaktivieren hebt das auf.
- „Passwort vergessen“ verrät nicht, ob ein Konto existiert.
- Links zeigen nur auf erlaubte Hosts.
- Name und Passwort lassen sich im Profil ändern.
- CI grün, keine high/critical Audit-Funde.
