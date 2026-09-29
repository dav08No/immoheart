import { describe, expect, it } from "vitest"
import {
  erlaubteAktionen,
  TREFFER_STATUS_LABEL,
  type ObjektStatus,
  type TrefferStatus,
} from "./uebergaenge"

const TREFFER_STATI: TrefferStatus[] = [
  "neu",
  "gesendet",
  "verworfen",
  "reserviert",
  "vermittelt",
  "abgelehnt",
  "erledigt",
]

const OBJEKT_STATI: ObjektStatus[] = ["verfuegbar", "reserviert", "vermietet"]

describe("erlaubteAktionen", () => {
  it("erlaubt bei gesendet+verfuegbar Reservieren und Ablehnen", () => {
    expect(erlaubteAktionen("gesendet", "verfuegbar")).toEqual(["reservieren", "ablehnen"])
  })

  it("erlaubt bei gesendet+reserviert (Objekt an jemand anderen) nur Ablehnen", () => {
    expect(erlaubteAktionen("gesendet", "reserviert")).toEqual(["ablehnen"])
  })

  it("erlaubt bei reserviert Vermitteln und Aufheben, unabhängig vom Objektstatus", () => {
    for (const objekt of OBJEKT_STATI) {
      expect(erlaubteAktionen("reserviert", objekt)).toEqual(["vermitteln", "aufheben"])
    }
  })

  it("erlaubt bei vermittelt keine weitere Aktion", () => {
    for (const objekt of OBJEKT_STATI) {
      expect(erlaubteAktionen("vermittelt", objekt)).toEqual([])
    }
  })

  it("deckt alle 7 Treffer- x 3 Objektstatus-Kombinationen konsistent ab", () => {
    for (const treffer of TREFFER_STATI) {
      for (const objekt of OBJEKT_STATI) {
        const aktionen = erlaubteAktionen(treffer, objekt)
        if (treffer === "gesendet" && objekt === "verfuegbar") {
          expect(aktionen).toEqual(["reservieren", "ablehnen"])
        } else if (treffer === "gesendet" && objekt === "reserviert") {
          expect(aktionen).toEqual(["ablehnen"])
        } else if (treffer === "reserviert") {
          expect(aktionen).toEqual(["vermitteln", "aufheben"])
        } else {
          expect(aktionen).toEqual([])
        }
      }
    }
  })
})

describe("TREFFER_STATUS_LABEL", () => {
  it("beschriftet gesendet als Angeboten, übrige wörtlich", () => {
    expect(TREFFER_STATUS_LABEL.neu).toBe("Neu")
    expect(TREFFER_STATUS_LABEL.gesendet).toBe("Angeboten")
    expect(TREFFER_STATUS_LABEL.verworfen).toBe("Verworfen")
    expect(TREFFER_STATUS_LABEL.reserviert).toBe("Reserviert")
    expect(TREFFER_STATUS_LABEL.vermittelt).toBe("Vermittelt")
    expect(TREFFER_STATUS_LABEL.abgelehnt).toBe("Abgelehnt")
    expect(TREFFER_STATUS_LABEL.erledigt).toBe("Erledigt")
  })
})
