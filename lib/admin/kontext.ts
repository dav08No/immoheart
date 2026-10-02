import { formatZahl } from "@/lib/format"

// Kontextzeilen unter dem Seitentitel: rein und getestet, damit Singular/Plural
// und 0-Fälle auf jeder Seite gleich formuliert sind.

const TRENNER = " · "

function anzahl(n: number, einzahl: string, mehrzahl: string): string {
  return `${formatZahl(n)} ${n === 1 ? einzahl : mehrzahl}`
}

// reserviert = Objekte im Status reserviert: offene Abschlüsse, die noch einen Vertrag brauchen.
export function kontextMatches(neueTreffer: number, langeOhneKontakt: number, reserviert = 0): string {
  const teile = [neueTreffer === 0 ? "Keine neuen Treffer" : anzahl(neueTreffer, "neuer Treffer", "neue Treffer")]
  if (reserviert > 0) teile.push(`${formatZahl(reserviert)} reserviert`)
  if (langeOhneKontakt > 0) teile.push(`${formatZahl(langeOhneKontakt)} lange ohne Kontakt`)
  return teile.join(TRENNER)
}

export function kontextAnfragen(offen: number, vermittelt: number): string {
  if (offen === 0 && vermittelt === 0) return "Noch keine Anfragen"
  return `${formatZahl(offen)} offen${TRENNER}${formatZahl(vermittelt)} vermittelt`
}

export function kontextObjekte(gesamt: number, oeffentlich: number): string {
  if (gesamt === 0) return "Noch keine Objekte im Bestand"
  return `${formatZahl(gesamt)} im Bestand${TRENNER}${formatZahl(oeffentlich)} öffentlich`
}

export function kontextEntwuerfe(offen: number): string {
  return offen === 0 ? "Keine offenen Entwürfe" : anzahl(offen, "offener Entwurf", "offene Entwürfe")
}

export function kontextNutzer(aktiv: number, eingeladen: number): string {
  const teile = [aktiv === 0 ? "Keine aktiven Konten" : anzahl(aktiv, "aktives Konto", "aktive Konten")]
  if (eingeladen > 0) teile.push(`${formatZahl(eingeladen)} eingeladen`)
  return teile.join(TRENNER)
}
