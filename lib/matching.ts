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
