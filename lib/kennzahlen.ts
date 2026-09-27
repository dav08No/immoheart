// Kennzahlen und Auswahl für die Startseite -- rein, damit ohne DB testbar.
export type Kennzahlen = { objekte: number; flaecheTotal: number; orte: number }

export function berechneKennzahlen(objekte: { ort: string; flaeche: number }[]): Kennzahlen {
  // "Solothurn" und " solothurn " sind derselbe Ort -- sonst zählt ein Tippfehler doppelt.
  const orte = new Set(objekte.map((o) => o.ort.trim().toLowerCase()).filter((ort) => ort !== ""))
  return {
    objekte: objekte.length,
    flaecheTotal: objekte.reduce((summe, o) => summe + o.flaeche, 0),
    orte: orte.size,
  }
}

// Objekte mit Titelbild wirken auf der Startseite besser -- zuerst diese, innerhalb
// der Gruppen die neuesten. Kopie statt sort() auf der Eingabe (keine Nebenwirkung).
export function waehleHighlights<T extends { titelbild: string | null; created_at: string }>(objekte: T[], max: number): T[] {
  return [...objekte]
    .sort((a, b) => {
      const bildA = a.titelbild ? 0 : 1
      const bildB = b.titelbild ? 0 : 1
      if (bildA !== bildB) return bildA - bildB
      return Date.parse(b.created_at) - Date.parse(a.created_at)
    })
    .slice(0, Math.max(0, max))
}
