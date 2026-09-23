import type { Anfrage, Objekt } from "@/types"

export function punkteFlaeche(anfrage: Anfrage, objekt: Objekt): number {
  const { flaecheMin, flaecheMax } = anfrage
  if (flaecheMin === null && flaecheMax === null) return 50

  const min = flaecheMin ?? 0
  const max = flaecheMax ?? Infinity
  if (objekt.flaeche >= min && objekt.flaeche <= max) return 100

  const referenz = objekt.flaeche < min ? min : max
  const abweichung = Math.abs(objekt.flaeche - referenz) / referenz
  return Math.max(0, Math.round(100 - abweichung * 100))
}

export function punktePreis(anfrage: Anfrage, objekt: Objekt): number {
  if (anfrage.budgetProM2 === null || objekt.preisProM2 === null) return 50
  if (objekt.preisProM2 <= anfrage.budgetProM2) return 100

  const ueberschreitung = (objekt.preisProM2 / anfrage.budgetProM2 - 1) * 100
  // Bis 12% über Budget gilt laut README noch als voller Treffer.
  if (ueberschreitung <= 12) return 100

  const ueberTolerierten = ueberschreitung - 12
  return Math.max(0, Math.round(100 - ueberTolerierten * 2))
}

const REGIONEN: Record<string, string> = {
  Solothurn: "Solothurn", Bettlach: "Jura", Selzach: "Jura",
  Zuchwil: "Wasseramt", Derendingen: "Wasseramt", Biberist: "Wasseramt", Luterbach: "Wasseramt",
  Wasseramt: "Wasseramt",
}

export function punkteLage(anfrage: Anfrage, objekt: Objekt): number {
  if (anfrage.ort === null) return 50
  if (anfrage.ort === objekt.ort) return 100
  const regionAnfrage = REGIONEN[anfrage.ort] ?? anfrage.ort
  const regionObjekt = REGIONEN[objekt.ort] ?? objekt.ort
  if (regionAnfrage === regionObjekt) return 60
  return 20
}

export function punkteBezug(anfrage: Anfrage, objekt: Objekt): number {
  if (anfrage.bezug === null) return 50
  if (anfrage.bezug.trim().toLowerCase() === "sofort") {
    const tage = (objekt.verfuegbarAb.getTime() - Date.now()) / 86_400_000
    if (tage <= 0) return 100
    if (tage <= 30) return 60
    return 20
  }
  return 60
}

export function punkteAnforderungen(anfrage: Anfrage, objekt: Objekt): number {
  const eintraege = Object.entries(anfrage.anforderungen)
  if (eintraege.length === 0) return 100

  const erfuellt = eintraege.filter(([schluessel, wert]) => {
    const angebotswert = objekt.eigenschaften[schluessel]
    if (typeof wert === "number") return typeof angebotswert === "number" && angebotswert >= wert
    return angebotswert === wert
  }).length

  return Math.round((erfuellt / eintraege.length) * 100)
}
