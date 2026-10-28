// Archivierte Objekte/Anfragen sind in Listen, Zählern, Puls, Postfach-Zuordnung und
// Matches unsichtbar (Spec §1). Geprüft wird die Mock-Chain je Query; Einzelabfragen
// per ID bleiben ungefiltert, weil Archiv-Seite und Rapport sie brauchen.
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/server", () => ({ erstelleServerClient: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({ erstelleAdminClient: vi.fn() }))
vi.mock("@/lib/queries/fotos", () => ({ holeTitelbilder: vi.fn(async () => ({})) }))
vi.mock("@/lib/queries/versand", () => ({ holeMatchIdsMitOffenemEntwurf: vi.fn(async () => new Set()) }))

import { erstelleServerClient } from "@/lib/supabase/server"
import { holeAnfrage, holeAnfragen, holeOffeneAnfragen, holeOffenePulsWerte } from "./anfragen"
import { holeObjekt, holeObjekte, holeVerfuegbareObjekte } from "./objekte"
import { holeAktiveObjekteNachEigentuemer } from "./objektmeldung"
import { holeOffeneAnfragenNachAbsender } from "./verarbeitung"
import { holeNeueMatches } from "./matches"
import { holeZahlen } from "./zahlen"

type Aufruf = { methode: string; args: unknown[] }
type Abfrage = { tabelle: string; aufrufe: Aufruf[] }

// Jede Kettenmethode wird aufgezeichnet; await liefert die Zeilen der Tabelle.
function fakeClient(daten: Record<string, unknown[]> = {}) {
  const abfragen: Abfrage[] = []
  const from = (tabelle: string) => {
    const abfrage: Abfrage = { tabelle, aufrufe: [] }
    abfragen.push(abfrage)
    const ergebnis = { data: daten[tabelle] ?? [], error: null, count: 0 }
    const kette: object = new Proxy(
      {},
      {
        get: (_ziel, name: string) =>
          name === "then"
            ? (resolve: (v: typeof ergebnis) => void) => resolve(ergebnis)
            : (...args: unknown[]) => (abfrage.aufrufe.push({ methode: name, args }), kette),
      }
    )
    return kette
  }
  vi.mocked(erstelleServerClient).mockResolvedValue({ from } as unknown as Awaited<
    ReturnType<typeof erstelleServerClient>
  >)
  return abfragen
}

const AKTIV = { methode: "is", args: ["archiviert_am", null] }

function aufrufeVon(abfragen: Abfrage[], tabelle: string): Aufruf[] {
  const treffer = abfragen.filter((a) => a.tabelle === tabelle)
  expect(treffer.length).toBeGreaterThan(0)
  return treffer.flatMap((a) => a.aufrufe)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("aktive Listen filtern archiviert_am", () => {
  it.each([
    ["holeAnfragen", "anfragen", () => holeAnfragen()],
    ["holeOffeneAnfragen", "anfragen", () => holeOffeneAnfragen()],
    ["holeOffenePulsWerte", "anfragen", () => holeOffenePulsWerte()],
    ["holeObjekte", "objekte", () => holeObjekte()],
    ["holeVerfuegbareObjekte", "objekte", () => holeVerfuegbareObjekte()],
    ["holeAktiveObjekteNachEigentuemer", "objekte", () => holeAktiveObjekteNachEigentuemer(["verfuegbar"])],
    ["holeOffeneAnfragenNachAbsender", "anfragen", () => holeOffeneAnfragenNachAbsender()],
  ] as const)("%s", async (_name, tabelle, aufruf) => {
    const abfragen = fakeClient()
    await aufruf()
    expect(aufrufeVon(abfragen, tabelle)).toContainEqual(AKTIV)
  })

  it("holeZahlen zählt nur aktive Anfragen", async () => {
    const abfragen = fakeClient()
    await holeZahlen(new Date("2026-10-27T00:00:00Z"))
    expect(aufrufeVon(abfragen, "anfragen")).toContainEqual(AKTIV)
  })
})

describe("Einzelabfragen per ID bleiben ungefiltert", () => {
  it.each([
    ["holeAnfrage", "anfragen", () => holeAnfrage("a1")],
    ["holeObjekt", "objekte", () => holeObjekt("o1")],
  ] as const)("%s", async (_name, tabelle, aufruf) => {
    const abfragen = fakeClient()
    await aufruf()
    expect(aufrufeVon(abfragen, tabelle)).not.toContainEqual(AKTIV)
  })
})

describe("holeNeueMatches", () => {
  const objekt = { titel: "T", adresse: "A", flaeche: 100, preis_pro_m2: null, foto_url: null }
  const match = (id: string, anfrage_id: string, archiviert_am: string | null) => ({
    id,
    anfrage_id,
    objekt_id: `o-${id}`,
    score: 80,
    kriterien: [],
    hinweis: "",
    angeboten_am: null,
    objekte: { ...objekt, archiviert_am },
  })

  it("blendet Treffer mit archivierter Anfrage oder archiviertem Objekt aus", async () => {
    const abfragen = fakeClient({
      matches: [match("m1", "a1", null), match("m2", "a1", "2026-10-01T00:00:00Z"), match("m3", "a-arch", null)],
      // Die archivierte Anfrage a-arch liefert die DB wegen des Filters gar nicht erst.
      anfragen: [{ id: "a1", firma_id: null, flaeche_min: null, flaeche_max: null, letzter_kontakt: "2026-10-01" }],
    })
    const ergebnis = await holeNeueMatches()
    expect(aufrufeVon(abfragen, "anfragen")).toContainEqual(AKTIV)
    expect(ergebnis.map((m) => m.id)).toEqual(["m1"])
    expect(ergebnis[0]?.objekt).toEqual({ titel: "T", adresse: "A", flaeche: 100, preis_pro_m2: null, titelbild: null })
  })
})
