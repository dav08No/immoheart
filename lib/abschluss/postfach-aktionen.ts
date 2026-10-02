// Reine Entscheidungen für die Abschluss-Aktionen im Postfach (Spec §2): welche Statusaktion
// eine Objektmeldung anbietet und ob eine Antwort "Firma lehnt ab" erlaubt.
import type { Aenderung } from "@/lib/ki/einordnung"
import type { Json } from "@/types/database"
import type { ObjektStatus } from "./uebergaenge"

export type MeldungsAktion = "nicht_verfuegbar" | "wieder_verfuegbar"
export type MeldungsAnzeige = { aenderung: Aenderung; zusammenfassung: string }

const AENDERUNGEN: readonly Aenderung[] = ["nicht_verfuegbar", "wieder_verfuegbar", "sonstige_aenderung"]

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === "object" && wert !== null && !Array.isArray(wert)
}

// Defensiv, weil jsonb alles halten kann; eine von Hand umkategorisierte Mail kann
// meldung = null tragen -- dann bleibt nur "Objekt öffnen".
export function meldungAus(felder: Json | null): MeldungsAnzeige {
  const meldung = istObjekt(felder) ? felder.meldung : null
  if (!istObjekt(meldung)) return { aenderung: "sonstige_aenderung", zusammenfassung: "" }
  const aenderung = AENDERUNGEN.find((a) => a === meldung.aenderung) ?? "sonstige_aenderung"
  const zusammenfassung = typeof meldung.zusammenfassung === "string" ? meldung.zusammenfassung : ""
  return { aenderung, zusammenfassung }
}

// Passt der heutige Objektstatus nicht mehr zur Meldung (z.B. schon vermietet), gibt es
// keine Statusaktion -- die DB würde den Übergang ohnehin ablehnen.
export function meldungsAktion(aenderung: Aenderung, status: ObjektStatus): MeldungsAktion | null {
  if (aenderung === "nicht_verfuegbar" && status !== "vermietet") return "nicht_verfuegbar"
  if (aenderung === "wieder_verfuegbar" && status !== "verfuegbar") return "wieder_verfuegbar"
  return null
}

// Nur Antworten auf ein Angebot tragen match_id; kein_interesse muss echt true sein.
export function abgelehnterTreffer(felder: Json | null): string | null {
  if (!istObjekt(felder) || felder.kein_interesse !== true) return null
  return typeof felder.match_id === "string" && felder.match_id !== "" ? felder.match_id : null
}
