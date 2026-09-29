import { describe, expect, it } from "vitest"
import { anfrageStatusTon, kiStatusTon, kontoStatusTon, objektStatusTon, pulsTon } from "./status-ton"

describe("objektStatusTon", () => {
  it("ordnet jeden Objektstatus einem Ton zu", () => {
    expect(objektStatusTon("verfuegbar")).toBe("gut")
    expect(objektStatusTon("reserviert")).toBe("warn")
    expect(objektStatusTon("vermietet")).toBe("neutral")
  })
})

describe("anfrageStatusTon", () => {
  it("ordnet jeden Anfragestatus einem Ton zu", () => {
    expect(anfrageStatusTon("offen")).toBe("info")
    expect(anfrageStatusTon("vermittelt")).toBe("gut")
    expect(anfrageStatusTon("ruhend")).toBe("neutral")
  })
})

describe("pulsTon", () => {
  it("übernimmt die Pulsfarbe als Ton", () => {
    expect(pulsTon("gut")).toBe("gut")
    expect(pulsTon("warn")).toBe("warn")
    expect(pulsTon("kritisch")).toBe("kritisch")
  })
})

describe("kiStatusTon", () => {
  it("ordnet die bekannten KI-Status zu", () => {
    expect(kiStatusTon("fertig")).toBe("gut")
    expect(kiStatusTon("laeuft")).toBe("info")
    expect(kiStatusTon("offen")).toBe("neutral")
    expect(kiStatusTon("fehler")).toBe("kritisch")
  })
  it("ist neutral ohne Status", () => {
    expect(kiStatusTon(null)).toBe("neutral")
  })
  it("ist neutral bei unbekanntem Status", () => {
    expect(kiStatusTon("irgendwas")).toBe("neutral")
    expect(kiStatusTon("")).toBe("neutral")
    expect(kiStatusTon("toString")).toBe("neutral")
  })
})

describe("kontoStatusTon", () => {
  it("ordnet jeden Kontostatus einem Ton zu", () => {
    expect(kontoStatusTon("eingeladen")).toBe("info")
    expect(kontoStatusTon("aktiv")).toBe("gut")
    expect(kontoStatusTon("deaktiviert")).toBe("neutral")
  })
})
