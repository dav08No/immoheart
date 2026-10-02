// objektZuordnen hängt neben der Meldung auch den Dank-Entwurf an das Objekt (Task 9),
// damit "Entwürfe erneut erzeugen" und die Entwurfs-Gruppe ihn dem Objekt zuordnen.
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/queries/profile", () => ({ holeEigenesProfil: vi.fn() }))
vi.mock("@/lib/queries/anfragen", () => ({ holeAnfrage: vi.fn() }))
vi.mock("@/lib/queries/objekte", () => ({ holeObjekt: vi.fn() }))
vi.mock("@/app/actions/anfragen", () => ({ anfrageAktualisieren: vi.fn() }))
vi.mock("@/app/actions/entwuerfe-hilfen", async () => {
  const { z } = await import("zod")
  return { idSchema: z.guid(), pfadeNeuLaden: vi.fn() }
})
vi.mock("@/lib/queries/nachrichten", () => ({
  holeNachricht: vi.fn(),
  aktualisiereNachricht: vi.fn(),
  verknuepfeDankEntwurfMitObjekt: vi.fn(),
}))

import { objektZuordnen } from "./eingang-aktionen"
import { aktualisiereNachricht, holeNachricht, verknuepfeDankEntwurfMitObjekt } from "@/lib/queries/nachrichten"
import { holeObjekt } from "@/lib/queries/objekte"
import type { NachrichtRow } from "@/lib/queries/nachrichten"

type ObjektRow = NonNullable<Awaited<ReturnType<typeof holeObjekt>>>

const EINGANG = "550e8400-e29b-41d4-a716-446655440000"
const OBJEKT = "550e8400-e29b-41d4-a716-446655440001"

beforeEach(() => vi.clearAllMocks())

describe("objektZuordnen", () => {
  it("setzt objekt_id an der Meldung und am offenen Dank-Entwurf", async () => {
    vi.mocked(holeNachricht).mockResolvedValue({ id: EINGANG, richtung: "eingang", kategorie: "objektmeldung" } as NachrichtRow)
    vi.mocked(holeObjekt).mockResolvedValue({ id: OBJEKT } as ObjektRow)

    await expect(objektZuordnen(EINGANG, OBJEKT)).resolves.toEqual({ fehler: null })

    expect(aktualisiereNachricht).toHaveBeenCalledWith(EINGANG, { objekt_id: OBJEKT })
    expect(verknuepfeDankEntwurfMitObjekt).toHaveBeenCalledWith(EINGANG, OBJEKT)
  })

  it("fasst bei einer anderen Kategorie nichts an", async () => {
    vi.mocked(holeNachricht).mockResolvedValue({ id: EINGANG, richtung: "eingang", kategorie: "antwort" } as NachrichtRow)

    const ergebnis = await objektZuordnen(EINGANG, OBJEKT)

    expect(ergebnis.fehler).toBeTruthy()
    expect(aktualisiereNachricht).not.toHaveBeenCalled()
    expect(verknuepfeDankEntwurfMitObjekt).not.toHaveBeenCalled()
  })
})
