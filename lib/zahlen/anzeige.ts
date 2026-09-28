// Kleine reine Helfer zwischen Query und Anzeige der Kennzahlenseite.

// Ein Diagramm ohne einen einzigen Wert > 0 zeigt den Leerzustand statt Nullbalken,
// die als Aussage ("es gab nichts") gelesen würden.
export function istLeer<T extends object>(zeilen: T[], schluessel: (keyof T)[]): boolean {
  return zeilen.every((z) => schluessel.every((s) => {
    const wert = z[s]
    return typeof wert !== "number" || wert <= 0
  }))
}

// Ganze Prozent ohne Intl (Hydration); Anteil kommt als 0..1 aus vermittlungsquote().
export function formatProzent(anteil: number): string {
  return `${Math.round(anteil * 100)} %`
}

// Eine Nachkommastelle reicht für "Tage bis Erstangebot"; ".0" fällt weg, damit
// ganze Tage nicht künstlich genau wirken.
export function formatTage(tage: number): string {
  const text = (Math.round(tage * 10) / 10).toFixed(1)
  return text.endsWith(".0") ? text.slice(0, -2) : text
}

// "Erst"angebot: pro Anfrage zählt nur das früheste gesendete Angebot -- spätere
// Nachfass-Angebote würden die Spanne sonst künstlich verlängern.
export function erstesAngebotJeAnfrage(
  angebote: { anfrage_id: string | null; gesendet_am: string | null }[],
  anfrageErstellt: Record<string, string>
): { anfrage_erstellt: string; gesendet_am: string }[] {
  const frueheste = new Map<string, string>()
  for (const a of angebote) {
    if (!a.anfrage_id || !a.gesendet_am || !(a.anfrage_id in anfrageErstellt)) continue
    const bisher = frueheste.get(a.anfrage_id)
    if (!bisher || new Date(a.gesendet_am).getTime() < new Date(bisher).getTime()) frueheste.set(a.anfrage_id, a.gesendet_am)
  }
  return [...frueheste.entries()].map(([id, gesendet_am]) => ({ anfrage_erstellt: anfrageErstellt[id] ?? gesendet_am, gesendet_am }))
}
