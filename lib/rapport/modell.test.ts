import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { BEISPIEL_JETZT, BEISPIEL_ROHDATEN } from "./beispiel-daten"
import { baueRapportModell } from "./modell"
import { LEERE_ROHDATEN } from "./roh"
import { rapportZeitraum } from "./zeitraum"

const z = rapportZeitraum(BEISPIEL_JETZT)
const FIXTURE = fileURLToPath(new URL("../../api/tests/fixtures/modell.json", import.meta.url))

describe("baueRapportModell", () => {
  it("liefert bei leeren Daten ein vollständiges Modell mit Nullen", () => {
    const m = baueRapportModell(LEERE_ROHDATEN, z)
    expect(m.zeitraum).toEqual({ label: "27.10.2025 – 27.10.2026", von: "2025-10-27", bis: "2026-10-27" })
    expect(m.kennzahlen).toHaveLength(6)
    expect(m.diagramme.anfragenProMonat).toHaveLength(13)
    expect(Object.values(m.tabellen).every((t) => t.zeilen.length === 0)).toBe(true)
    expect(m.hinweise).toContain("Endgültig gelöschte Einträge sind nicht enthalten.")
  })

  it("zählt Treffer nach Ergebnis inklusive Archiv", () => {
    const m = baueRapportModell(BEISPIEL_ROHDATEN, z)
    const summe = m.diagramme.trefferNachErgebnis.reduce((s, e) => s + e.anzahl, 0)
    expect(summe).toBe(m.kennzahlen.find((k) => k.schluessel === "treffer")?.wert)
    expect(m.diagramme.trefferNachErgebnis.find((e) => e.ergebnis === "Archiviert")?.anzahl).toBe(1)
  })

  it("enthält keine E-Mail-Adresse, auch wenn Freitext eine trägt", () => {
    const roh = {
      ...BEISPIEL_ROHDATEN,
      firmen: [...BEISPIEL_ROHDATEN.firmen.slice(1), { id: "f1", name: "info@muster.ch" }],
      objekte: BEISPIEL_ROHDATEN.objekte.map((o) => ({ ...o, ort: `${o.ort} (eigentuemer@privat.ch)` })),
    }
    const json = JSON.stringify(baueRapportModell(roh, z))
    expect(json).not.toContain("@")
    expect(JSON.stringify(baueRapportModell(BEISPIEL_ROHDATEN, z))).not.toContain("@")
  })

  // Vertrag mit Python (R2): die Fixture muss genau dem entsprechen, was baueRapportModell
  // liefert. Neu schreiben mit FIXTURE_SCHREIBEN=1 npx vitest run lib/rapport/modell.test.ts
  it("stimmt mit api/tests/fixtures/modell.json überein", () => {
    const erwartet = `${JSON.stringify(baueRapportModell(BEISPIEL_ROHDATEN, z), null, 2)}\n`
    if (process.env.FIXTURE_SCHREIBEN === "1") writeFileSync(FIXTURE, erwartet, "utf8")
    // CRLF normalisieren: git kann die Datei auf Windows mit CRLF auschecken.
    expect(readFileSync(FIXTURE, "utf8").replace(/\r\n/g, "\n")).toBe(erwartet)
  })
})
