// Eine Stelle für "welcher Status bekommt welche Farbe" -- sonst driften Objekt-,
// Anfrage- und Konto-Chips auf den einzelnen Seiten auseinander.
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

export function objektStatusTon(s: keyof typeof OBJEKT): StatusTon {
  return OBJEKT[s]
}

export function anfrageStatusTon(s: keyof typeof ANFRAGE): StatusTon {
  return ANFRAGE[s]
}

export function pulsTon(farbe: "gut" | "warn" | "kritisch"): StatusTon {
  return farbe
}

const KONTO: Record<"eingeladen" | "aktiv" | "deaktiviert", StatusTon> = {
  eingeladen: "info",
  aktiv: "gut",
  deaktiviert: "neutral",
}

export function kontoStatusTon(s: keyof typeof KONTO): StatusTon {
  return KONTO[s]
}
