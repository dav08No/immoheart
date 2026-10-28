import { describe, expect, it } from "vitest"
import { dateinameAus } from "./RapportKnopf"

describe("dateinameAus", () => {
  it("liest den Dateinamen aus Content-Disposition", () => {
    expect(dateinameAus('attachment; filename="immoheart-rapport-2025-10-27-bis-2026-10-27.xlsx"')).toBe(
      "immoheart-rapport-2025-10-27-bis-2026-10-27.xlsx"
    )
  })

  it("fällt ohne Kopf, ohne filename oder mit leerem Namen auf den Ersatznamen zurück", () => {
    for (const kopf of [null, "", "attachment", 'attachment; filename=""']) {
      expect(dateinameAus(kopf)).toBe("immoheart-rapport.xlsx")
    }
  })
})
