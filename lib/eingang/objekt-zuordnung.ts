export type ObjektZuordnung = { objektId: string; grund: "verlauf" | "eigentuemer" }

// Gleiche Regeln wie findeAnfrageFuerAntwort (zuordnung.ts): Verlauf ist der eindeutige
// Beleg, die Absenderadresse nur, wenn sie genau ein aktives Objekt meint.
export function findeObjektFuerMeldung(p: {
  referenzen: string[]
  gesendete: { message_id: string; objekt_id: string | null }[]
  absender: string
  aktiveNachEigentuemer: Record<string, string[]>
}): ObjektZuordnung | null {
  const objektNachMessageId = new Map(
    p.gesendete.flatMap((g) => (g.objekt_id ? [[g.message_id, g.objekt_id] as const] : []))
  )
  // Letzte Referenz = jüngste Mail im Verlauf.
  for (let i = p.referenzen.length - 1; i >= 0; i--) {
    const objektId = objektNachMessageId.get(p.referenzen[i] ?? "")
    if (objektId) return { objektId, grund: "verlauf" }
  }
  // Mehrere aktive Objekte desselben Eigentümers: lieber nicht zuordnen als falsch.
  const aktive = p.aktiveNachEigentuemer[p.absender.trim().toLowerCase()] ?? []
  const einziges = aktive.length === 1 ? aktive[0] : undefined
  return einziges ? { objektId: einziges, grund: "eigentuemer" } : null
}

// Kurzfassung eines Objekts für den Antwort-Prompt auf ein Angebot.
export function objektEckdaten(o: { flaeche: number; preis_pro_m2: number | null; ort: string }): string {
  const teile = [`${o.flaeche} m²`, o.preis_pro_m2 !== null ? `CHF ${o.preis_pro_m2}/m²` : null, o.ort]
  return teile.filter((t): t is string => t !== null).join(", ")
}
