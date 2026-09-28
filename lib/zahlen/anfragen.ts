// Reine Aggregationen über Anfragen für die Admin-Kennzahlenseite -- Rohzeilen rein,
// keine Supabase-Zugriffe hier (die leben in lib/queries/).
import { letzteMonate, monatLabel, monatSchluessel } from "./zeitraeume"

export function anfragenProMonat(
  anfragen: { created_at: string; quelle: string }[],
  jetzt: Date,
  monate = 12
): { monat: string; label: string; mail: number; website: number; manuell: number }[] {
  const monate_ = letzteMonate(jetzt, monate)
  const erlaubt = new Set(monate_)
  const zaehler = new Map<string, { mail: number; website: number; manuell: number }>()
  for (const a of anfragen) {
    const schluessel = monatSchluessel(new Date(a.created_at))
    if (!erlaubt.has(schluessel)) continue
    const eintrag = zaehler.get(schluessel) ?? { mail: 0, website: 0, manuell: 0 }
    if (a.quelle === "mail") eintrag.mail++
    else if (a.quelle === "website") eintrag.website++
    else if (a.quelle === "manuell") eintrag.manuell++
    // unbekannte Quelle: bewusst nirgends gezählt, statt die Summe zu verfälschen
    zaehler.set(schluessel, eintrag)
  }
  return monate_.map((monat) => ({ monat, label: monatLabel(monat), ...(zaehler.get(monat) ?? { mail: 0, website: 0, manuell: 0 }) }))
}

// quote als Anteil (0..1), nicht als gerundetes Prozent -- die Rundung ist Sache der
// Anzeige, nicht der Aggregation.
export function vermittlungsquote(anfragen: { status: string }[]): { quote: number | null; vermittelt: number; gesamt: number } {
  const gesamt = anfragen.length
  const vermittelt = anfragen.filter((a) => a.status === "vermittelt").length
  return { quote: gesamt > 0 ? vermittelt / gesamt : null, vermittelt, gesamt }
}

export function tageBisErstangebot(paare: { anfrage_erstellt: string; gesendet_am: string }[]): {
  median: number | null
  schnitt: number | null
  anzahl: number
} {
  const tage = paare
    .map((p) => (new Date(p.gesendet_am).getTime() - new Date(p.anfrage_erstellt).getTime()) / 86_400_000)
    .filter((t) => t >= 0) // negative Spannen sind Dateneingabefehler, nicht Teil der Kennzahl
    .sort((a, b) => a - b)
  const anzahl = tage.length
  if (anzahl === 0) return { median: null, schnitt: null, anzahl: 0 }

  const mitte = Math.floor(anzahl / 2)
  // slice() statt direktem Index-Zugriff -- liefert unter noUncheckedIndexedAccess
  // garantiert number[] statt (number | undefined), ohne Non-Null-Assertion.
  const mittlereWerte = anzahl % 2 === 0 ? tage.slice(mitte - 1, mitte + 1) : tage.slice(mitte, mitte + 1)
  const median = mittlereWerte.reduce((s, v) => s + v, 0) / mittlereWerte.length
  const schnitt = tage.reduce((s, v) => s + v, 0) / anzahl
  return { median, schnitt, anzahl }
}

// Direktanfragen pro Objekt (objekt_id gesetzt) -- die Vorfilterung auf die Kategorie
// "objektanfrage" macht die aufrufende Query, diese Funktion zählt nur.
export function topObjekte(anfragen: { objekt_id: string | null }[], titel: Record<string, string>, max = 5): { titel: string; anzahl: number }[] {
  const zaehler = new Map<string, number>()
  for (const a of anfragen) {
    if (!a.objekt_id) continue
    zaehler.set(a.objekt_id, (zaehler.get(a.objekt_id) ?? 0) + 1)
  }
  return [...zaehler.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, Math.max(0, max))
    .map(([objektId, anzahl]) => ({ titel: titel[objektId] ?? objektId, anzahl })) // fehlender Titel (z.B. gelöschtes Objekt) -> ID statt Leerfeld
}
