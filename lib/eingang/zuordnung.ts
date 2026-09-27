import { referenzListe } from "@/lib/mail/eingang"
import type { Nutzung } from "@/types"

// Gespeichert steht In-Reply-To vorne (referenzListe); für "neueste gewinnt" muss die
// direkte Vorgängermail aber ans Ende der chronologischen References-Reihe.
export function referenzenAeltesteZuerst(inReplyTo: string | null, referenzen: string | null): string[] {
  const ids = referenzListe(undefined, referenzen ?? undefined)
  if (!inReplyTo) return ids
  return [...ids.filter((id) => id !== inReplyTo), inReplyTo]
}

export type Zuordnung = { anfrageId: string; grund: "verlauf" | "absender" }

export function findeAnfrageFuerAntwort(p: {
  referenzen: string[]
  gesendete: { message_id: string; anfrage_id: string | null }[]
  absender: string
  offeneNachAbsender: Record<string, string[]>
}): Zuordnung | null {
  const anfrageNachMessageId = new Map(
    p.gesendete.flatMap((g) => (g.anfrage_id ? [[g.message_id, g.anfrage_id] as const] : []))
  )
  // Die letzte Referenz ist die jüngste Mail im Verlauf -- sie gewinnt, falls ein
  // Faden zwischendurch einer anderen Anfrage zugeordnet wurde.
  for (let i = p.referenzen.length - 1; i >= 0; i--) {
    const anfrageId = anfrageNachMessageId.get(p.referenzen[i] ?? "")
    if (anfrageId) return { anfrageId, grund: "verlauf" }
  }
  // Nur eindeutig: bei mehreren offenen Anfragen derselben Adresse lieber gar nicht
  // zuordnen als falsch.
  const offene = p.offeneNachAbsender[p.absender.toLowerCase()] ?? []
  const einzige = offene.length === 1 ? offene[0] : undefined
  return einzige ? { anfrageId: einzige, grund: "absender" } : null
}

const NUTZUNG_LABEL: Record<Nutzung, string> = {
  buero: "Büro",
  gewerbe: "Gewerbe",
  produktion: "Produktion",
  lager: "Lager",
  verkauf: "Verkauf",
  bauland: "Bauland",
}

export type AnfrageEckdaten = {
  nutzung: Nutzung | null
  flaeche_min: number | null
  flaeche_max: number | null
  ort: string | null
  budget_pro_m2: number | null
  bezug: string | null
}

function flaecheText(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) return `${min}–${max} m²`
  if (min !== null) return `ab ${min} m²`
  if (max !== null) return `bis ${max} m²`
  return null
}

export function anfrageKurz(a: AnfrageEckdaten | null): string | null {
  if (!a) return null
  const teile = [
    a.nutzung ? NUTZUNG_LABEL[a.nutzung] : null,
    flaecheText(a.flaeche_min, a.flaeche_max),
    a.ort,
    a.budget_pro_m2 !== null ? `Budget CHF ${a.budget_pro_m2}/m²` : null,
    a.bezug ? `Bezug ${a.bezug}` : null,
  ].filter((t): t is string => t !== null)
  return teile.length > 0 ? teile.join(", ") : null
}
