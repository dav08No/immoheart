// Prüft nur die Reihenfolge/Kurzschluss-Logik von objektAnfragen (Honeypot → Zeit-Token
// → zod), nicht die Supabase-Anbindung selbst: formularGeheimnis, zaehleEinsendung,
// holeOeffentlichesObjekt und erstelleAdminClient werden gemockt, weil die echten Module
// "server-only" importieren (bricht ausserhalb von Next.js sofort beim Import) und weil
// hier ausschliesslich interessiert, DASS das Limit/die DB in diesen drei Fällen
// überhaupt nicht angefasst wird.
import { beforeEach, describe, expect, it, vi } from "vitest"
import { erstelleZeitToken } from "@/lib/formular-schutz"

vi.mock("@/lib/formular-geheimnis", () => ({ formularGeheimnis: () => "test-geheimnis" }))
vi.mock("@/lib/queries/formular-limits", () => ({ zaehleEinsendung: vi.fn() }))
vi.mock("@/lib/queries/oeffentlich", () => ({ holeOeffentlichesObjekt: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({ erstelleAdminClient: vi.fn() }))

import { objektAnfragen } from "./objektanfrage"
import { zaehleEinsendung } from "@/lib/queries/formular-limits"
import { erstelleAdminClient } from "@/lib/supabase/admin"

const GUELTIGE_FELDER = {
  firma: "Muster AG",
  name: "Anna Muster",
  email: "anna@muster.ch",
  nachricht: "Wir interessieren uns für dieses Objekt.",
  objektId: "550e8400-e29b-41d4-a716-446655440000",
}

describe("objektAnfragen -- Prüfreihenfolge", () => {
  beforeEach(() => {
    vi.mocked(zaehleEinsendung).mockClear()
    vi.mocked(erstelleAdminClient).mockClear()
  })

  it("prüft Limit/DB nicht, wenn der Honeypot ausgefüllt ist", async () => {
    const ergebnis = await objektAnfragen({ webseite: "http://spam.example", zeitToken: "egal", ...GUELTIGE_FELDER })
    expect(ergebnis).toEqual({ ok: true })
    expect(zaehleEinsendung).not.toHaveBeenCalled()
    expect(erstelleAdminClient).not.toHaveBeenCalled()
  })

  it("prüft Limit/DB nicht bei ungültigem Zeit-Token", async () => {
    const ergebnis = await objektAnfragen({ webseite: "", zeitToken: "nicht-geparsbar", ...GUELTIGE_FELDER })
    expect(ergebnis.ok).toBe(false)
    expect(zaehleEinsendung).not.toHaveBeenCalled()
    expect(erstelleAdminClient).not.toHaveBeenCalled()
  })

  it("prüft Limit/DB nicht bei ungültiger Eingabe (zod)", async () => {
    // Echtes, gültiges Zeit-Token (4 s alt, > MINDESTZEIT_MS) mit demselben Geheimnis
    // wie der Mock oben -- nur so kommt die Prüfung überhaupt bis zu zod.
    const zeitToken = erstelleZeitToken(Date.now() - 4000, "test-geheimnis")
    const ergebnis = await objektAnfragen({ webseite: "", zeitToken, ...GUELTIGE_FELDER, email: "keine-email" })
    expect(ergebnis.ok).toBe(false)
    if (!ergebnis.ok) expect(ergebnis.feldFehler?.email).toBeTruthy()
    expect(zaehleEinsendung).not.toHaveBeenCalled()
    expect(erstelleAdminClient).not.toHaveBeenCalled()
  })
})
