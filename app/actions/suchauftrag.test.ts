// Prüft die Verdrahtung von suchauftragSenden mit dem gemeinsamen Ablauf: dieselbe
// Prüfreihenfolge wie objektAnfragen (Honeypot → Zeit-Token → zod, ohne Limit/DB)
// und dass Eingang + Entwurf als Website-Suchanfrage verknüpft gespeichert werden.
// Supabase, Header und Cache sind gemockt ("server-only" bricht ausserhalb von Next.js).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { erstelleZeitToken } from "@/lib/formular-schutz"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }) }))
vi.mock("@/lib/formular-geheimnis", () => ({ formularGeheimnis: () => "test-geheimnis" }))
vi.mock("@/lib/queries/formular-limits", () => ({ zaehleEinsendung: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({ erstelleAdminClient: vi.fn() }))

import { suchauftragSenden } from "./suchauftrag"
import { zaehleEinsendung } from "@/lib/queries/formular-limits"
import { erstelleAdminClient } from "@/lib/supabase/admin"

const GUELTIGE_FELDER = {
  firma: "[TEST] Muster AG",
  branche: "Logistik",
  name: "Anna Muster",
  email: "anna@muster.ch",
  telefon: "",
  nutzung: "lager",
  ort: "Solothurn",
  flaecheMin: "500",
  flaecheMax: "",
  budgetProM2: "",
  bezug: "",
  nachricht: "",
}

// Gibt die eingefügten Zeilen in Reihenfolge zurück; der Eingang bekommt die ID "eingang-1".
function fakeAdmin(): Record<string, unknown>[] {
  const eingefuegt: Record<string, unknown>[] = []
  const client = {
    from: () => ({
      insert: (zeile: Record<string, unknown>) => {
        eingefuegt.push(zeile)
        const ergebnis = { error: null }
        return Object.assign(Promise.resolve(ergebnis), {
          select: () => ({ single: async () => ({ data: { id: "eingang-1" }, error: null }) }),
        })
      },
    }),
  }
  vi.mocked(erstelleAdminClient).mockReturnValue(client as unknown as ReturnType<typeof erstelleAdminClient>)
  return eingefuegt
}

describe("suchauftragSenden", () => {
  beforeEach(() => {
    vi.mocked(zaehleEinsendung).mockReset()
    vi.mocked(erstelleAdminClient).mockReset()
    vi.stubEnv("GMAIL_USER", "immoheart@example.ch")
  })
  afterEach(() => vi.unstubAllEnvs())

  it("prüft Limit/DB nicht, wenn der Honeypot ausgefüllt ist", async () => {
    const ergebnis = await suchauftragSenden({ webseite: "http://spam.example", zeitToken: "egal", ...GUELTIGE_FELDER })
    expect(ergebnis).toEqual({ ok: true })
    expect(zaehleEinsendung).not.toHaveBeenCalled()
    expect(erstelleAdminClient).not.toHaveBeenCalled()
  })

  it("prüft Limit/DB nicht bei ungültigem Zeit-Token", async () => {
    const ergebnis = await suchauftragSenden({ webseite: "", zeitToken: "nicht-geparsbar", ...GUELTIGE_FELDER })
    expect(ergebnis).toMatchObject({ ok: false, tokenErneuern: true })
    expect(zaehleEinsendung).not.toHaveBeenCalled()
    expect(erstelleAdminClient).not.toHaveBeenCalled()
  })

  it("prüft Limit/DB nicht bei ungültiger Eingabe (zod)", async () => {
    const zeitToken = erstelleZeitToken(Date.now() - 4000, "test-geheimnis")
    const ergebnis = await suchauftragSenden({ webseite: "", zeitToken, ...GUELTIGE_FELDER, ort: "" })
    expect(ergebnis.ok).toBe(false)
    if (!ergebnis.ok) expect(ergebnis.feldFehler?.ort).toBe("Bitte geben Sie einen Ort an.")
    expect(zaehleEinsendung).not.toHaveBeenCalled()
    expect(erstelleAdminClient).not.toHaveBeenCalled()
  })

  it("speichert Eingang und Entwurf als verknüpfte Website-Suchanfrage", async () => {
    vi.mocked(zaehleEinsendung).mockResolvedValue(1)
    const eingefuegt = fakeAdmin()
    const zeitToken = erstelleZeitToken(Date.now() - 4000, "test-geheimnis")

    expect(await suchauftragSenden({ webseite: "", zeitToken, ...GUELTIGE_FELDER })).toEqual({ ok: true })

    const [eingang, entwurf] = eingefuegt
    expect(eingang).toMatchObject({ richtung: "eingang", kategorie: "suchanfrage", quelle: "website", von: "anna@muster.ch" })
    expect(eingang?.erkannte_felder).toMatchObject({ branche: "Logistik", nutzung: "lager", flaeche_min: 500 })
    expect(entwurf).toMatchObject({
      richtung: "entwurf",
      typ: "antwort",
      kategorie: "suchanfrage",
      quelle: "website",
      an: "anna@muster.ch",
      antwort_auf: "eingang-1",
    })
  })

  it("speichert nichts über dem Limit", async () => {
    vi.mocked(zaehleEinsendung).mockResolvedValue(6)
    const zeitToken = erstelleZeitToken(Date.now() - 4000, "test-geheimnis")
    const ergebnis = await suchauftragSenden({ webseite: "", zeitToken, ...GUELTIGE_FELDER })
    expect(ergebnis).toEqual({ ok: false, fehler: "Zu viele Anfragen. Bitte später erneut versuchen." })
    expect(erstelleAdminClient).not.toHaveBeenCalled()
  })
})
