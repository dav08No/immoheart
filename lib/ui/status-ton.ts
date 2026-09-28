// Eine Stelle für "welcher Status bekommt welche Farbe" -- sonst driften Objekt-,
// Anfrage- und KI-Chips auf den einzelnen Seiten auseinander.
// Der Typ lebt hier (nicht im Chip), damit reine Logik nicht von Komponenten abhängt.
export type StatusTon = "gut" | "warn" | "kritisch" | "info" | "neutral"

const OBJEKT: Record<"verfuegbar" | "reserviert" | "vermietet", StatusTon> = {
  verfuegbar: "gut",
  reserviert: "warn",
  vermietet: "neutral",
}

const ANFRAGE: Record<"offen" | "vermittelt" | "ruhend", StatusTon> = {
  offen: "info",
  vermittelt: "gut",
  ruhend: "neutral",
}

// ki_status ist in der DB ein freier Text; Unbekanntes bleibt neutral statt zu raten.
const KI: Record<string, StatusTon> = {
  fertig: "gut",
  laeuft: "info",
  offen: "neutral",
  fehler: "kritisch",
}

export function objektStatusTon(s: keyof typeof OBJEKT): StatusTon {
  return OBJEKT[s]
}

export function anfrageStatusTon(s: keyof typeof ANFRAGE): StatusTon {
  return ANFRAGE[s]
}

export function pulsTon(farbe: "gut" | "warn" | "kritisch"): StatusTon {
  return farbe
}

export function kiStatusTon(s: string | null): StatusTon {
  // hasOwn, damit z. B. "toString" nicht den Objekt-Prototyp trifft.
  if (s === null || !Object.hasOwn(KI, s)) return "neutral"
  return KI[s] ?? "neutral"
}
