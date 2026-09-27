// Reine Umwandlung einer Eingangs-Zeile in Startwerte für ObjektFormular (Task 7, Link
// "Als Objekt übernehmen" im Postfach, ?aus=<Eingangs-id>) -- ohne DB-Zugriff, damit ohne
// Rendering testbar. Die Seite (app/admin/objekte/page.tsx) validiert nur die uuid und
// lädt die Zeile per holeNachricht; alles andere (falsche Kategorie, gelöscht, nicht
// gefunden) wird hier still ignoriert (null), statt einen Fehler zu zeigen -- ein
// veralteter oder manipulierter Link soll einfach wie "kein ?aus=" wirken.
import { objektDatenAus } from "@/lib/postfach"
import type { Database } from "@/types/database"
import type { Nutzung } from "@/types"

type NachrichtRow = Database["public"]["Tables"]["nachrichten"]["Row"]
type EingangFuerVorbelegung = Pick<NachrichtRow, "richtung" | "kategorie" | "geloescht_am" | "erkannte_felder" | "von">

export type ObjektVorbelegungWerte = Partial<{
  titel: string
  adresse: string
  ort: string
  flaeche: string
  preis: string
  nutzung: Nutzung
  verfuegbarAb: string
  eigentuemer: string
}>

export function objektVorbelegung(eingang: EingangFuerVorbelegung | null): ObjektVorbelegungWerte | null {
  if (!eingang || eingang.richtung !== "eingang" || eingang.geloescht_am || eingang.kategorie !== "objektangebot") {
    return null
  }
  const objekt = objektDatenAus(eingang.erkannte_felder)
  return {
    titel: objekt?.titel ?? undefined,
    adresse: objekt?.adresse ?? undefined,
    ort: objekt?.ort ?? undefined,
    flaeche: objekt?.flaeche != null ? String(objekt.flaeche) : undefined,
    preis: objekt?.preis_pro_m2 != null ? String(objekt.preis_pro_m2) : undefined,
    nutzung: objekt?.nutzung ?? undefined,
    verfuegbarAb: objekt?.verfuegbar_ab ?? undefined,
    // Eigentümer-Default = Absenderadresse (Brief): wer die Mail schickt, bietet in
    // aller Regel im eigenen Namen an; anders als die übrigen Felder nie von der KI
    // erkannt, also unabhängig von erkannte_felder gesetzt.
    eigentuemer: eingang.von,
  }
}
