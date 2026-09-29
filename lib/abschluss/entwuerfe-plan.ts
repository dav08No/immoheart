// Reine Planung der Abschluss-Entwürfe (Spec §1 Tabelle, §2 KI-Ausfall): welche Mails eine
// Aktion braucht und welche Platzhalter beim Nachholen noch gefüllt werden müssen.
import type { EigentuemerAnlass } from "@/lib/ki/abschluss-entwuerfe"
import type { Database, Json } from "@/types/database"

export type AbschlussTyp = "absage" | "eigentuemer_info" | "bestaetigung"
export const ABSCHLUSS_TYPEN: readonly AbschlussTyp[] = ["absage", "eigentuemer_info", "bestaetigung"]

export type AbschlussAktion = "reservieren" | "vermitteln" | "aufheben" | "nicht_verfuegbar"

export type GeplanterEntwurf = {
  typ: AbschlussTyp
  an: string
  match_id: string | null
  objekt_id: string
  anlass?: EigentuemerAnlass
}

// firma ist optional ergänzt: nur für den Hinweistext, wenn die Adresse fehlt.
type TrefferEmpfaenger = { id: string; firmaEmail: string | null; firma?: string | null }

const EIGENTUEMER_FEHLT = "Eigentümer-E-Mail fehlt – keine Info-Mail möglich"
const ANLASS: Partial<Record<AbschlussAktion, EigentuemerAnlass>> = {
  reservieren: "reserviert",
  vermitteln: "vermietet",
  aufheben: "aufgehoben",
}

function adresse(email: string | null): string | null {
  const bereinigt = email?.trim()
  return bereinigt ? bereinigt : null
}

export function planeEntwuerfe(p: {
  aktion: AbschlussAktion
  objekt: { id: string; titel: string; eigentuemer_email: string | null }
  treffer: TrefferEmpfaenger | null
  erledigte: TrefferEmpfaenger[]
}): { geplant: GeplanterEntwurf[]; hinweise: string[] } {
  const geplant: GeplanterEntwurf[] = []
  const hinweise: string[] = []
  const objekt_id = p.objekt.id

  // Absagen nur bei endgültigem Abschluss -- beim Reservieren bleiben die anderen Firmen offen.
  if (p.aktion === "vermitteln" || p.aktion === "nicht_verfuegbar") {
    for (const e of p.erledigte) {
      const an = adresse(e.firmaEmail)
      if (an) geplant.push({ typ: "absage", an, match_id: e.id, objekt_id })
      else hinweise.push(`${e.firma ?? "Eine Firma"} hat keine E-Mail – keine Absage möglich`)
    }
  }

  // Bei der Objektmeldung entsteht der Dank an den Eigentümer schon beim Einlesen.
  const anlass = ANLASS[p.aktion]
  if (anlass) {
    const an = adresse(p.objekt.eigentuemer_email)
    if (an) geplant.push({ typ: "eigentuemer_info", an, match_id: p.treffer?.id ?? null, objekt_id, anlass })
    else hinweise.push(EIGENTUEMER_FEHLT)
  }

  if (p.aktion === "vermitteln" && p.treffer) {
    const an = adresse(p.treffer.firmaEmail)
    if (an) geplant.push({ typ: "bestaetigung", an, match_id: p.treffer.id, objekt_id })
    else hinweise.push(`${p.treffer.firma ?? "Die Firma"} hat keine E-Mail – keine Bestätigung möglich`)
  }

  return { geplant, hinweise }
}

// Markierung eines Platzhalter-Entwurfs in erkannte_felder (Ruling R7): ki_ausstehend bleibt
// true, bis die KI den Text geliefert hat; anlass braucht das Nachholen für die Eigentümer-Info.
export type AbschlussMarker = { ki_ausstehend: boolean; anlass?: EigentuemerAnlass }

const ANLAESSE: readonly EigentuemerAnlass[] = ["reserviert", "vermietet", "aufgehoben", "meldung_dank"]

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === "object" && wert !== null && !Array.isArray(wert)
}

// Defensiv, weil jsonb alles halten kann.
export function abschlussMarker(felder: Json | null): AbschlussMarker | null {
  if (!istObjekt(felder) || !istObjekt(felder.abschluss)) return null
  const { ki_ausstehend, anlass } = felder.abschluss
  if (typeof ki_ausstehend !== "boolean") return null
  const gueltigerAnlass = ANLAESSE.find((a) => a === anlass)
  return gueltigerAnlass ? { ki_ausstehend, anlass: gueltigerAnlass } : { ki_ausstehend }
}

export function markerFelder(marker: AbschlussMarker): Json {
  return { abschluss: marker.anlass ? { ki_ausstehend: marker.ki_ausstehend, anlass: marker.anlass } : { ki_ausstehend: marker.ki_ausstehend } }
}

type NachrichtRow = Database["public"]["Tables"]["nachrichten"]["Row"]
type PlatzhalterKandidat = Pick<NachrichtRow, "typ" | "richtung" | "body" | "geloescht_am" | "gesendet_am" | "erkannte_felder">

function istAbschlussTyp(typ: NachrichtRow["typ"]): typ is AbschlussTyp {
  return ABSCHLUSS_TYPEN.some((t) => t === typ)
}

// Nur offene Platzhalter nachholen: gelöschte sind bewusst verworfen, gesendete/reservierte
// dürfen nicht mehr verändert werden, und ein schon selbst geschriebener Text bleibt stehen.
// So erzeugt das Nachholen nie neue Zeilen und ist beliebig oft wiederholbar.
export function zuFuellendePlatzhalter<T extends PlatzhalterKandidat>(zeilen: T[]): T[] {
  return zeilen.filter(
    (z) =>
      z.richtung === "entwurf" &&
      z.geloescht_am === null &&
      z.gesendet_am === null &&
      istAbschlussTyp(z.typ) &&
      z.body.trim() === "" &&
      abschlussMarker(z.erkannte_felder)?.ki_ausstehend === true
  )
}
