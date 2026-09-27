# Relaunch N3 · Entwürfe-Tab, echter Versand, Verlauf — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle Mail-Entwürfe an einem Ort (`/admin/entwuerfe`) bearbeiten (An, Betreff, Text), per Gmail wirklich senden (im selben Mailverlauf), weich löschen, und frei neue Mails schreiben.

**Architecture:** `nachrichten` bekommt Versand-Spalten (`message_id`, `in_reply_to`, `referenzen`, `versand_fehler`, `geloescht_am`, `antwort_auf`). Senden läuft in einer Server Action, die den Entwurf zuerst atomar „reserviert“ (bedingtes UPDATE), dann per SMTP sendet und bei Fehler die Reservierung zurücknimmt. Verlaufs-Header (`In-Reply-To`, `References`) kommen aus den bereits gesendeten Mails derselben Anfrage bzw. der beantworteten Eingangsmail. Das Postfach zeigt nur noch Eingang und Gesendet; Entwürfe leben im neuen Tab.

**Tech Stack:** Next.js 15.5, Supabase, nodemailer 10.0.10, zod 4.6.5, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-26-relaunch-design.md` (Abschnitt 2 „Entwürfe“, 3 „/admin/entwuerfe“, „/admin“, „Seitenleiste“, 5 „Migrationen“ für `nachrichten`)

## Global Constraints

- Alle Regeln aus N1/N2: deutsche Fachbegriffe / englische Technik, kein `any`, Dateien < 200 Zeilen, Datenzugriff in `lib/queries/`, Schreibzugriffe als Server Actions, Kommentare nur für das *Warum*.
- **Nichts verlässt das System ohne Klick.** Kein Codepfad sendet automatisch; nur `entwurfSenden` ruft SMTP für Kundenmails auf.
- Jede Server Action, die eine Mail versendet, prüft selbst `holeEigenesProfil()` (eingeloggt + aktiv) — SMTP ist nicht durch RLS geschützt.
- Eingaben aus Formularen werden mit zod geprüft (`an` gültige E-Mail, keine Zeilenumbrüche in Betreff).
- Gelöschte Entwürfe werden nur markiert (`geloescht_am`), nie physisch gelöscht, und überall ausgeblendet.
- Neue Tabellen/Spalten: keine neuen anon-Rechte (N2-Default gilt; bei neuen Tabellen zusätzlich explizit `revoke all … from anon`).
- Absender ist immer `process.env.GMAIL_USER`; die alte Adresse `kontakt@espaceso.ch` wird nirgends mehr neu geschrieben.
- Signatur der KI-Entwürfe: „Freundliche Grüsse\nimmoheart“.
- Testmails nur an `immoheart.business+<x>@gmail.com` oder `davide.nocito28@yahoo.com`.
- Neue Pakete: keine.
- Jeder Commit endet mit Leerzeile und exakt:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01CbSKvzEHCKZUWFsZgFgstd`
- Branch `feature/n3-entwuerfe`, Worktree `.worktrees/n3`. Blockierte Befehle: BLOCKED melden, nicht umgehen.

## Dateiübersicht

| Datei | Aktion | Zweck |
|---|---|---|
| `supabase/migrations/20260927200000_n3_entwuerfe.sql` | neu | Spalten, Enum-Werte, Index |
| `lib/mail/verlauf.ts`, `.test.ts` | neu | Verlaufs-Header und „Re:“-Betreff |
| `lib/entwurf-schema.ts`, `.test.ts` | neu | zod-Schema für bearbeitete/neue Entwürfe |
| `lib/mail/versand.ts` | ändern | `inReplyTo`, `references` |
| `lib/queries/nachrichten.ts` | ändern | gelöschte ausblenden, Entwürfe-/Verlauf-Abfragen, Zähler |
| `app/actions/entwuerfe.ts` | neu | speichern, senden, löschen, neue Mail |
| `app/actions/nachrichten.ts` | ändern | alte Entwurfs-Actions entfernen, Absender, `antwort_auf` |
| `app/actions/matches.ts` | ändern | Absender, „Re:“, Rückgabe der Entwurfs-ID |
| `lib/ki/entwuerfe.ts` (+ Test) | ändern | Signatur immoheart |
| `app/admin/entwuerfe/page.tsx`, `components/entwuerfe/*` | neu | Tab Entwürfe |
| `components/postfach/*`, `app/admin/postfach/page.tsx` | ändern | ohne Entwürfe, Filter „Gesendet“, Link zur Rückfrage |
| `components/matches/*` | ändern | „Angebot entwerfen“, „Nachfass entwerfen“ → Entwurf öffnen |
| `components/layout/Sidebar.tsx`, `app/admin/layout.tsx` | ändern | Eintrag „Entwürfe“ mit Badge |
| `components/postfach/EntwurfDetail.tsx` | löschen | ersetzt durch `components/entwuerfe/EntwurfEditor.tsx` |

---

### Task 1: Migration N3

**Files:**
- Create: `supabase/migrations/20260927200000_n3_entwuerfe.sql`
- Modify: `types/database.ts` (Controller)

- [ ] **Step 1: Migration schreiben**

```sql
-- Relaunch N3: echter Versand über Gmail. message_id/in_reply_to/referenzen
-- halten den Mailverlauf beim Empfänger zusammen; versand_fehler zeigt
-- fehlgeschlagene Versuche am Entwurf; geloescht_am ersetzt physisches Löschen
-- (Statistik "gesendet vs. gelöscht" ab N7); antwort_auf verknüpft einen Entwurf
-- mit der Eingangsmail, auf die er antwortet.
alter table nachrichten
  add column message_id text unique,
  add column in_reply_to text,
  add column referenzen text,
  add column versand_fehler text,
  add column geloescht_am timestamptz,
  add column antwort_auf uuid references nachrichten (id) on delete set null;

alter type nachricht_typ_enum add value if not exists 'antwort';
alter type nachricht_typ_enum add value if not exists 'frei';

create index if not exists nachrichten_anfrage_gesendet_idx
  on nachrichten (anfrage_id, gesendet_am) where richtung = 'gesendet';
```

- [ ] **Step 2: Controller** spielt die Migration ein (MCP `apply_migration`, Name `n3_entwuerfe`), erzeugt `types/database.ts` neu (`npm run types`) und committet beides. Implementer schreibt nur die SQL-Datei und committet sie:

```bash
git add supabase/migrations/20260927200000_n3_entwuerfe.sql
git commit -m "feat(db): Versand-Spalten und Entwurfstypen fuer N3"
```

(Alte App auf Production liest keine dieser Spalten → rein ergänzend, sofort einspielbar.)

---

### Task 2: Reine Logik — Verlauf und Entwurf-Schema (TDD)

**Files:**
- Create: `lib/mail/verlauf.ts`, `lib/mail/verlauf.test.ts`, `lib/entwurf-schema.ts`, `lib/entwurf-schema.test.ts`

**Interfaces:**
- Produces:
  - `verlaufsKoepfe(bisherigeIds: string[]): { inReplyTo: string | null; referenzen: string | null }` — `bisherigeIds` chronologisch aufsteigend; `inReplyTo` = letzte ID; `referenzen` = höchstens die letzten 10 IDs, mit Leerzeichen getrennt; leere Liste → beide `null`.
  - `antwortBetreff(betreff: string): string` — setzt „Re: “ davor, ausser der Betreff beginnt bereits (ohne Beachtung von Gross/Klein) mit `re:`, `aw:` oder `wg:`; kürzt auf 200 Zeichen.
  - `entwurfSchema` (zod): `{ an: E-Mail (getrimmt, klein, max 254), betreff: string getrimmt 1–200 ohne \r \n, body: string 1–20000 }`, Typ `EntwurfEingabe`.

- [ ] **Step 1: Failing tests** — `lib/mail/verlauf.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { antwortBetreff, verlaufsKoepfe } from "./verlauf"

describe("verlaufsKoepfe", () => {
  it("liefert null ohne Vorgänger", () => {
    expect(verlaufsKoepfe([])).toEqual({ inReplyTo: null, referenzen: null })
  })
  it("setzt In-Reply-To auf die letzte und References auf alle IDs", () => {
    expect(verlaufsKoepfe(["<a@x>", "<b@x>"])).toEqual({ inReplyTo: "<b@x>", referenzen: "<a@x> <b@x>" })
  })
  it("begrenzt References auf die letzten 10", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `<${i}@x>`)
    const koepfe = verlaufsKoepfe(ids)
    expect(koepfe.inReplyTo).toBe("<11@x>")
    expect(koepfe.referenzen?.split(" ")).toHaveLength(10)
    expect(koepfe.referenzen?.startsWith("<2@x>")).toBe(true)
  })
})

describe("antwortBetreff", () => {
  it("setzt Re: davor", () => {
    expect(antwortBetreff("Lagerfläche Zuchwil")).toBe("Re: Lagerfläche Zuchwil")
  })
  it("verdoppelt kein bestehendes Re:/AW:/WG:", () => {
    expect(antwortBetreff("Re: Anfrage")).toBe("Re: Anfrage")
    expect(antwortBetreff("AW: Anfrage")).toBe("AW: Anfrage")
    expect(antwortBetreff("wg: Anfrage")).toBe("wg: Anfrage")
  })
  it("kürzt auf 200 Zeichen", () => {
    expect(antwortBetreff("x".repeat(300))).toHaveLength(200)
  })
})
```

`lib/entwurf-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { entwurfSchema } from "./entwurf-schema"

describe("entwurfSchema", () => {
  it("normalisiert gültige Eingaben", () => {
    expect(entwurfSchema.parse({ an: " Kunde@Firma.CH ", betreff: " Angebot ", body: "Hallo" })).toEqual({
      an: "kunde@firma.ch",
      betreff: "Angebot",
      body: "Hallo",
    })
  })
  it("lehnt ungültige Adresse, leeren Text und Zeilenumbruch im Betreff ab", () => {
    expect(entwurfSchema.safeParse({ an: "kein-mail", betreff: "A", body: "B" }).success).toBe(false)
    expect(entwurfSchema.safeParse({ an: "a@b.ch", betreff: "A", body: "" }).success).toBe(false)
    expect(entwurfSchema.safeParse({ an: "a@b.ch", betreff: "A\r\nBcc: x@y.ch", body: "B" }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run** `npx vitest run lib/mail/verlauf.test.ts lib/entwurf-schema.test.ts` — Expected: FAIL (Module fehlen).

- [ ] **Step 3: `lib/mail/verlauf.ts`**

```ts
const MAX_REFERENZEN = 10
const MAX_BETREFF = 200

export function verlaufsKoepfe(bisherigeIds: string[]): { inReplyTo: string | null; referenzen: string | null } {
  if (bisherigeIds.length === 0) return { inReplyTo: null, referenzen: null }
  // Mailprogramme bauen den Verlauf aus In-Reply-To und References; eine
  // begrenzte Kette reicht und hält den Header kurz.
  return {
    inReplyTo: bisherigeIds[bisherigeIds.length - 1] ?? null,
    referenzen: bisherigeIds.slice(-MAX_REFERENZEN).join(" "),
  }
}

export function antwortBetreff(betreff: string): string {
  const bereinigt = betreff.trim()
  const mitPraefix = /^(re|aw|wg):/i.test(bereinigt) ? bereinigt : `Re: ${bereinigt}`
  return mitPraefix.slice(0, MAX_BETREFF)
}
```

- [ ] **Step 4: `lib/entwurf-schema.ts`**

```ts
import { z } from "zod"

export const entwurfSchema = z.object({
  an: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  // Zeilenumbrüche im Betreff würden sonst als zusätzliche Mail-Header gelesen.
  betreff: z.string().trim().min(1).max(200).regex(/^[^\r\n]*$/),
  body: z.string().min(1).max(20000),
})

export type EntwurfEingabe = z.infer<typeof entwurfSchema>
```

- [ ] **Step 5: Run** — Expected: PASS. Dann `npm run lint && npx tsc --noEmit && npm run test`.

- [ ] **Step 6: Commit**

```bash
git add lib/mail/verlauf.ts lib/mail/verlauf.test.ts lib/entwurf-schema.ts lib/entwurf-schema.test.ts
git commit -m "feat: Verlaufs-Header, Antwort-Betreff und Entwurf-Schema"
```

---

### Task 3: Versand mit Verlaufs-Headern, Abfragen, Entwurfs-Actions

**Files:**
- Modify: `lib/mail/versand.ts`, `lib/queries/nachrichten.ts`, `app/actions/nachrichten.ts`, `app/actions/matches.ts`, `lib/ki/entwuerfe.ts`, `lib/ki/entwuerfe.test.ts` (falls es die Signatur prüft)
- Create: `app/actions/entwuerfe.ts`

**Interfaces:**
- Consumes: `verlaufsKoepfe`, `antwortBetreff`, `entwurfSchema`, `holeEigenesProfil`, `sendeMail`.
- Produces:
  - `sendeMail(an: string, mail: Mail, verlauf?: { inReplyTo: string | null; referenzen: string | null }): Promise<{ messageId: string }>`
  - Queries: `holeNachrichten()` (ohne gelöschte, ohne Entwürfe), `holeEntwuerfe(): Promise<EntwurfMitBezug[]>`, `zaehleEntwuerfe(): Promise<number>`, `zaehleNachrichten()` (nur noch `eingang`), `holeGesendeteIdsFuerAnfrage(anfrageId: string): Promise<string[]>`, `reserviereEntwurf(id: string): Promise<NachrichtRow | null>`, `gibReservierungFrei(id: string, fehler: string): Promise<void>`, `markiereGesendet(id: string, felder: { von: string; message_id: string; in_reply_to: string | null; referenzen: string | null }): Promise<void>`
  - `type EntwurfMitBezug = NachrichtRow & { bezug: string | null }` (kurzer Text: Firma/Ort der Anfrage oder Objekttitel)
  - Actions in `app/actions/entwuerfe.ts`: `entwurfSpeichern(id: string, eingabe: EntwurfEingabe): Promise<void>`, `entwurfSenden(id: string): Promise<void>`, `entwurfLoeschen(id: string): Promise<void>`, `neueMail(eingabe: EntwurfEingabe & { anfrageId?: string }): Promise<{ id: string }>`
  - `matchSenden(matchId)` → `Promise<{ entwurfId: string }>`, `anfrageNachfragen(anfrageId)` → `Promise<{ entwurfId: string }>`

- [ ] **Step 1: `lib/mail/versand.ts`** — Signatur erweitern, in `sendMail({...})` ergänzen:

```ts
    ...(verlauf?.inReplyTo ? { inReplyTo: verlauf.inReplyTo } : {}),
    ...(verlauf?.referenzen ? { references: verlauf.referenzen } : {}),
```

- [ ] **Step 2: `lib/queries/nachrichten.ts`**
  1. `holeNachrichten()`: zusätzlich `.is("geloescht_am", null).neq("richtung", "entwurf")`.
  2. `zaehleNachrichten()`: nur `.eq("richtung", "eingang").is("geloescht_am", null)`; Kommentar anpassen („Badge Postfach = unbearbeitete Eingänge“).
  3. Neu:

```ts
export type EntwurfMitBezug = NachrichtRow & { bezug: string | null }

export async function holeEntwuerfe(): Promise<EntwurfMitBezug[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .select("*, anfragen(ort, firmen(name)), matches(objekte(titel))")
    .eq("richtung", "entwurf")
    .is("geloescht_am", null)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data.map(({ anfragen, matches, ...n }) => ({
    ...n,
    bezug: matches?.objekte?.titel ?? anfragen?.firmen?.name ?? anfragen?.ort ?? null,
  }))
}

export async function zaehleEntwuerfe(): Promise<number> {
  const supabase = await erstelleServerClient()
  const { count, error } = await supabase
    .from("nachrichten")
    .select("id", { count: "exact", head: true })
    .eq("richtung", "entwurf")
    .is("geloescht_am", null)
  if (error) throw error
  return count ?? 0
}

export async function holeGesendeteIdsFuerAnfrage(anfrageId: string): Promise<string[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .select("message_id")
    .eq("anfrage_id", anfrageId)
    .eq("richtung", "gesendet")
    .not("message_id", "is", null)
    .order("gesendet_am", { ascending: true })
  if (error) throw error
  return data.flatMap((n) => (n.message_id ? [n.message_id] : []))
}

// Bedingtes UPDATE als Sperre: nur ein Aufruf bekommt die Zeile zurück, ein
// Doppelklick oder zweiter Tab erhält null und sendet nicht ein zweites Mal.
export async function reserviereEntwurf(id: string): Promise<NachrichtRow | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .update({ gesendet_am: new Date().toISOString(), versand_fehler: null })
    .eq("id", id)
    .eq("richtung", "entwurf")
    .is("gesendet_am", null)
    .is("geloescht_am", null)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function gibReservierungFrei(id: string, fehler: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("nachrichten").update({ gesendet_am: null, versand_fehler: fehler }).eq("id", id)
  if (error) throw error
}

export async function markiereGesendet(
  id: string,
  felder: { von: string; message_id: string; in_reply_to: string | null; referenzen: string | null }
): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("nachrichten").update({ ...felder, richtung: "gesendet" }).eq("id", id)
  if (error) throw error
}
```

(Die Embeds `anfragen(...)`/`matches(...)` gehen über die bestehenden Fremdschlüssel `anfrage_id`/`match_id`; `firmen` über `anfragen.firma_id`, `objekte` über `matches.objekt_id`. Falls die generierten Typen die Embeds nicht als Einzelobjekt typisieren, mit einer schmalen Hilfsfunktion statt `as` auflösen und im Report vermerken.)

  4. `loescheNachricht` bleibt (wird von `alsAnfrageSpeichern` nicht genutzt); prüfen, ob es danach noch Aufrufer gibt — wenn keine, entfernen.

- [ ] **Step 3: `app/actions/entwuerfe.ts`**

```ts
"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { holeEigenesProfil } from "@/lib/queries/profile"
import {
  aktualisiereNachricht,
  gibReservierungFrei,
  holeGesendeteIdsFuerAnfrage,
  holeNachricht,
  legeNachrichtAn,
  markiereGesendet,
  reserviereEntwurf,
} from "@/lib/queries/nachrichten"
import { aktualisiereAnfrage } from "@/lib/queries/anfragen"
import { entwurfSchema, type EntwurfEingabe } from "@/lib/entwurf-schema"
import { verlaufsKoepfe } from "@/lib/mail/verlauf"
import { escapeHtml } from "@/lib/mail/vorlagen"
import { sendeMail } from "@/lib/mail/versand"

const idSchema = z.uuid()

function pfadeNeuLaden() {
  revalidatePath("/admin/entwuerfe")
  revalidatePath("/admin/postfach")
  revalidatePath("/admin", "layout")
}

async function offenerEntwurf(id: string) {
  const entwurf = await holeNachricht(idSchema.parse(id))
  if (!entwurf || entwurf.richtung !== "entwurf" || entwurf.geloescht_am) throw new Error("Entwurf nicht gefunden")
  return entwurf
}

export async function entwurfSpeichern(id: string, eingabe: EntwurfEingabe): Promise<void> {
  await holeEigenesProfil()
  await offenerEntwurf(id)
  const geprueft = entwurfSchema.safeParse(eingabe)
  if (!geprueft.success) throw new Error("Bitte gültige Empfängeradresse, Betreff und Text angeben.")
  await aktualisiereNachricht(id, { ...geprueft.data, versand_fehler: null })
  pfadeNeuLaden()
}

export async function entwurfLoeschen(id: string): Promise<void> {
  await holeEigenesProfil()
  await offenerEntwurf(id)
  await aktualisiereNachricht(id, { geloescht_am: new Date().toISOString() })
  pfadeNeuLaden()
}

export async function neueMail(eingabe: EntwurfEingabe & { anfrageId?: string }): Promise<{ id: string }> {
  await holeEigenesProfil()
  const geprueft = entwurfSchema.safeParse(eingabe)
  if (!geprueft.success) throw new Error("Bitte gültige Empfängeradresse, Betreff und Text angeben.")
  const anfrageId = eingabe.anfrageId ? idSchema.parse(eingabe.anfrageId) : null
  const neu = await legeNachrichtAn({
    richtung: "entwurf",
    typ: "frei",
    anfrage_id: anfrageId,
    von: process.env.GMAIL_USER ?? "",
    ...geprueft.data,
  })
  pfadeNeuLaden()
  return { id: neu.id }
}

// Einziger Pfad, über den eine Kundenmail das System verlässt -- immer durch einen
// Klick ausgelöst. Reihenfolge: Entwurf prüfen -> atomar reservieren -> senden ->
// als gesendet markieren; bei SMTP-Fehler wird die Reservierung mit Fehlertext
// zurückgenommen, der Entwurf bleibt bestehen.
export async function entwurfSenden(id: string): Promise<void> {
  await holeEigenesProfil()
  const entwurf = await offenerEntwurf(id)
  const geprueft = entwurfSchema.safeParse({ an: entwurf.an, betreff: entwurf.betreff, body: entwurf.body })
  if (!geprueft.success) throw new Error("Empfängeradresse, Betreff oder Text ist ungültig. Bitte zuerst bearbeiten.")

  const reserviert = await reserviereEntwurf(id)
  if (!reserviert) throw new Error("Dieser Entwurf wird bereits gesendet oder wurde geändert.")

  const bisherige = entwurf.anfrage_id ? await holeGesendeteIdsFuerAnfrage(entwurf.anfrage_id) : []
  if (entwurf.antwort_auf) {
    const beantwortet = await holeNachricht(entwurf.antwort_auf)
    if (beantwortet?.message_id) bisherige.push(beantwortet.message_id)
  }
  const verlauf = verlaufsKoepfe(bisherige)
  const { betreff, body, an } = geprueft.data

  try {
    const { messageId } = await sendeMail(
      an,
      { betreff, text: body, html: `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(body)}</div>` },
      verlauf
    )
    await markiereGesendet(id, {
      von: process.env.GMAIL_USER ?? "",
      message_id: messageId,
      in_reply_to: verlauf.inReplyTo,
      referenzen: verlauf.referenzen,
    })
  } catch (fehler) {
    console.error("entwurfSenden fehlgeschlagen", fehler)
    await gibReservierungFrei(id, "Versand fehlgeschlagen. Bitte später erneut versuchen.")
    pfadeNeuLaden()
    throw new Error("Versand fehlgeschlagen. Der Entwurf ist gespeichert.")
  }

  if (entwurf.anfrage_id) {
    await aktualisiereAnfrage(entwurf.anfrage_id, { letzter_kontakt: new Date().toISOString() })
    revalidatePath("/admin/anfragen")
  }
  pfadeNeuLaden()
}
```

Hinweis: `bisherige.push` nach `holeGesendeteIdsFuerAnfrage` hängt die beantwortete Eingangsmail ans Ende (sie ist in N3 noch ohne `message_id`, ab N4 mit). Doppelte IDs vorher entfernen: `const bisherige = [...new Set([...])]` — implementiere es so, dass keine ID doppelt vorkommt.

- [ ] **Step 4: `app/actions/nachrichten.ts`**
  1. `entwurfSenden`, `entwurfBearbeiten`, `entwurfVerwerfen` entfernen (ersetzt durch `app/actions/entwuerfe.ts`); unbenutzte Imports entfernen.
  2. In `nachrichtEingegangen`: `an: process.env.GMAIL_USER ?? ""` statt `kontakt@espaceso.ch`; Rückfrage-Entwurf mit `von: process.env.GMAIL_USER ?? ""`, `betreff: antwortBetreff(betreff)` (Betreff der Eingangsmail statt KI-Betreff) und `antwort_auf: nachricht.id`.

- [ ] **Step 5: `app/actions/matches.ts`**
  1. `von: process.env.GMAIL_USER ?? ""` statt `kontakt@espaceso.ch` (zwei Stellen).
  2. Betreff: Gibt es für die Anfrage bereits gesendete Mails (`holeGesendeteIdsFuerAnfrage(anfrage.id)` nicht leer), dann `antwortBetreff(<betreff der zuletzt gesendeten Mail>)` statt KI-Betreff. Dafür eine Query `holeLetztenGesendetenBetreff(anfrageId: string): Promise<string | null>` in `lib/queries/nachrichten.ts` ergänzen (`order gesendet_am desc limit 1`).
  3. `legeNachrichtAn` gibt die Zeile zurück → `matchSenden` und `anfrageNachfragen` geben `{ entwurfId: neu.id }` zurück.
  4. Den Match-Status `gesendet` erst setzen, wenn der Entwurf angelegt ist (wie bisher); Kommentar: „Match gilt als bearbeitet, sobald ein Angebotsentwurf existiert.“

- [ ] **Step 6: Signatur** — in `lib/ki/entwuerfe.ts` `espaceSOLOTHURN` → `immoheart` im `AUSGABEFORMAT`. Falls `lib/ki/entwuerfe.test.ts` den Text prüft, anpassen.

- [ ] **Step 7:** `npm run lint && npx tsc --noEmit && npm run test && npm run build` — grün. Commit:

```bash
git add -A
git commit -m "feat: echter Versand mit Verlauf, Entwurfs-Actions, Absender immoheart"
```

---

### Task 4: Tab „Entwürfe“ und Seitenleiste

**Files:**
- Create: `app/admin/entwuerfe/page.tsx`, `components/entwuerfe/EntwuerfeAnsicht.tsx`, `components/entwuerfe/EntwurfEditor.tsx`, `components/entwuerfe/NeueMailDialog.tsx`
- Modify: `components/layout/Sidebar.tsx`, `app/admin/layout.tsx`
- Delete: `components/postfach/EntwurfDetail.tsx` (in Task 5, wenn das Postfach es nicht mehr importiert)

**Interfaces:**
- Consumes: `holeEntwuerfe`, `EntwurfMitBezug`, `zaehleEntwuerfe`, Actions aus Task 3.
- Produces: Seite `/admin/entwuerfe?id=<uuid>` wählt den Entwurf vor.

- [ ] **Step 1: `app/admin/entwuerfe/page.tsx`** (Server Component, Next 15 `searchParams: Promise<{ id?: string }>`): lädt `holeEntwuerfe()`, rendert `<Header titel="Entwürfe" untertitel={`${n} offen`} />` und `<EntwuerfeAnsicht entwuerfe={…} startId={id ?? null} />` (id nur übernehmen, wenn sie in der Liste vorkommt).

- [ ] **Step 2: `components/entwuerfe/EntwuerfeAnsicht.tsx`** (Client): zweispaltig wie das Postfach (`grid-cols-[minmax(0,340px)_minmax(0,1fr)]`, auf schmalen Bildschirmen einspaltig).
  - Links oben Knopf „Neue Mail“ (öffnet `NeueMailDialog`), darunter die Liste gruppiert nach Typ in fester Reihenfolge: Antworten (`antwort`, `rueckfrage`), Angebote (`angebot`), Nachfass (`nachfass`), Frei (`frei`); leere Gruppen ausblenden. Jede Zeile: Betreff (fett), `an`, `bezug` (grau), roter Punkt, wenn `versand_fehler` gesetzt.
  - Rechts `<EntwurfEditor key={ausgewaehlt.id} entwurf={ausgewaehlt} />` oder Platzhalter „Kein Entwurf ausgewählt.“ bzw. „Keine offenen Entwürfe.“
  - Nach Senden/Löschen: Auswahl auf den nächsten Entwurf der Liste setzen (die Liste aktualisiert sich über `revalidatePath`).

- [ ] **Step 3: `components/entwuerfe/EntwurfEditor.tsx`** (Client, < 200 Zeilen):
  - Felder `An` (input type email), `Betreff` (input), `Text` (textarea, 12 Zeilen), immer editierbar; Anzeige von `versand_fehler` in `text-crit` über den Feldern.
  - Knöpfe: „Speichern“ (nur aktiv, wenn geändert), „Senden“ (primär; speichert Änderungen zuerst über `entwurfSpeichern`, dann `entwurfSenden`), „Löschen“ (zeigt In-Seite-Bestätigung „Entwurf wirklich löschen?“ + „Ja, löschen“, kein Browser-Dialog).
  - Vor dem Senden eine In-Seite-Bestätigung: „An <an> senden?“ + „Jetzt senden“ (verhindert versehentliches Senden).
  - Ein `laufend`-State sperrt alle Knöpfe; Fehler als `toast.error`, Erfolg als `toast.success("Gesendet")` bzw. „Gespeichert“/„Gelöscht“.

- [ ] **Step 4: `components/entwuerfe/NeueMailDialog.tsx`** (Client): shadcn `Dialog` mit An/Betreff/Text, „Als Entwurf anlegen“ → `neueMail(...)`, danach `router.push(`/admin/entwuerfe?id=${id}`)` und Dialog schliessen. Kein Direkt-Senden aus dem Dialog (Grundsatz: senden nur aus dem Editor).

- [ ] **Step 5: Seitenleiste** — `app/admin/layout.tsx` lädt zusätzlich `zaehleEntwuerfe()` und gibt `entwurfAnzahl` an `Sidebar`. In `Sidebar.tsx` Eintrag `{ pfad: "/admin/entwuerfe", label: "Entwürfe", Icon: PenLine }` direkt nach „Postfach“; Badge wie beim Postfach mit `entwurfAnzahl`. Aktiv-Markierung: `pfad === ziel || (ziel !== "/admin" && pfad.startsWith(ziel + "/"))`.

- [ ] **Step 6:** Prüfen + Commit:

```bash
npm run lint && npx tsc --noEmit && npm run test && npm run build
git add -A
git commit -m "feat: Tab Entwuerfe mit Editor, neuer Mail und Badge"
```

---

### Task 5: Postfach ohne Entwürfe, Matches öffnen den Entwurf

**Files:**
- Modify: `components/postfach/PostfachAnsicht.tsx`, `components/postfach/NachrichtenListe.tsx`, `components/postfach/EingangDetail.tsx`, `app/admin/postfach/page.tsx`, `components/matches/MatchesAnsicht.tsx`, `components/matches/MatchCard.tsx`, `components/matches/MatchDetail.tsx`
- Delete: `components/postfach/EntwurfDetail.tsx`

- [ ] **Step 1: Postfach**
  - `NachrichtenListe`: Filter `"alle" | "eingang" | "gesendet"`, Beschriftung „Alle / Eingang / Gesendet“.
  - `PostfachAnsicht`: gesendete Mails rechts schreibgeschützt anzeigen (kleine Komponente im selben File oder `GesendetDetail.tsx`: An, Betreff, gesendet am, Text; `versand_fehler` gibt es hier nicht). Den Import von `EntwurfDetail` entfernen.
  - `rueckfrageOeffnen`: sucht die Rückfrage über `antwort_auf === eingang.id` (statt typ+an) — liegt sie noch als Entwurf vor, `router.push(`/admin/entwuerfe?id=${id}`)`; ist sie gesendet, im Postfach auswählen (Filter „Alle“). Für Altdaten ohne `antwort_auf` bleibt der bisherige Treffer über typ+an als Fallback. Den langen Kommentarblock dazu auf 2–3 Zeilen kürzen.
  - `app/admin/postfach/page.tsx`: Untertitel „Eingang und Gesendet“. `holeNachrichten()` liefert Entwürfe nicht mehr — die Rückfrage-Suche braucht aber Entwürfe: `page.tsx` lädt zusätzlich `holeEntwuerfe()` und reicht `{ id, antwort_auf, an, typ }` als `rueckfragen` an `PostfachAnsicht` durch.
  - `components/postfach/EntwurfDetail.tsx` per `git rm` löschen.

- [ ] **Step 2: Matches**
  - Knopftexte: „Angebot senden“ → „Angebot entwerfen“ (MatchCard, MatchDetail), „Nachfragen“ → „Nachfass entwerfen“ (MatchesAnsicht). Fehlermeldungen entsprechend („Angebot entwerfen fehlgeschlagen …“).
  - Nach Erfolg `router.push(`/admin/entwuerfe?id=${entwurfId}`)`.

- [ ] **Step 3:** Prüfen + Commit:

```bash
npm run lint && npx tsc --noEmit && npm run test && npm run build
git add -A
git commit -m "feat: Postfach zeigt Eingang und Gesendet, Matches oeffnen den Entwurf"
```

---

### Task 6: Gesamtprüfung, Push

- [ ] `npm run lint && npx tsc --noEmit && npm run test && npm run build && npm audit --omit=dev` grün.
- [ ] `grep -rn "kontakt@espaceso.ch\|espaceSOLOTHURN" app lib components` → nur noch der Footer-Text „ein Angebot von espaceSOLOTHURN“.
- [ ] `grep -rn "sendeMail(" app lib` → nur `entwurfSenden`, `kontoAnlegen`, `einladungErneutSenden`, `passwortVergessen`.
- [ ] `git push -u origin feature/n3-entwuerfe`.

### Task 7: Live-Test auf dem Preview (Controller + Davide), Merge

- [ ] Davide ist auf dem Preview als vermittler eingeloggt.
- [ ] **Neue Mail:** „Neue Mail“ an `immoheart.business+n3a@gmail.com`, Betreff „[TEST] Versand 1“ → Entwurf erscheint, Badge „Entwürfe“ zählt 1.
- [ ] **Bearbeiten + Senden:** Text ändern, Speichern, Senden mit Bestätigung → Toast „Gesendet“, Entwurf verschwindet, Postfach-Filter „Gesendet“ zeigt ihn. IMAP (nur lesen): Mail angekommen, Absender `immoheart`, Betreff und geänderter Text korrekt.
- [ ] **Verlauf:** Eine Test-Anfrage mit Test-Firma (`kontakt_email = immoheart.business+n3b@gmail.com`) per SQL anlegen (Controller, `[TEST]` im Namen), „Nachfass entwerfen“ → Editor öffnet sich; senden. Zweiten Nachfass entwerfen → Betreff beginnt mit „Re: “; senden. IMAP: zweite Mail hat `In-Reply-To` = `Message-ID` der ersten; Gmail zeigt beide im selben Verlauf. `letzter_kontakt` der Anfrage ist aktualisiert.
- [ ] **Löschen:** Entwurf anlegen und löschen → verschwindet; in der DB `geloescht_am` gesetzt.
- [ ] **Doppelklick-Schutz:** In der DB prüfen, dass jede gesendete Mail genau einmal im Gmail-Posteingang liegt.
- [ ] **Aufräumen:** Test-Nachrichten, Test-Anfrage, Test-Firma per SQL löschen (nur `[TEST]`-Zeilen, vorher auflisten).
- [ ] Davides OK → Merge auf `main`, Production-Kurzprüfung (`/admin/entwuerfe` ohne Login → `/login`).

## Abnahme N3

- Ein Entwurf lässt sich in An, Betreff und Text bearbeiten, speichern und senden; die Mail kommt über Gmail an.
- Folgemails zur selben Anfrage landen beim Empfänger im selben Verlauf (`In-Reply-To`/`References`, „Re:“).
- Versandfehler lassen den Entwurf mit Fehlermeldung stehen; ein Doppelklick sendet nicht doppelt.
- Gelöschte Entwürfe verschwinden überall, bleiben aber in der DB markiert.
- Es gibt keinen automatischen Versand; Kundenmails gehen nur über „Senden“ im Editor raus.
- Seitenleiste: „Entwürfe“ mit Anzahl offener Entwürfe; Postfach-Badge zählt nur Eingänge.
