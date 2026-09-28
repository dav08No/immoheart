// Reine Ableitungen aus KI-erkannten Feldern (kein DB-Zugriff) -- so lassen sie sich
// ohne Supabase-Mocking testen, siehe *.test.ts daneben.
import { z } from "zod"
import type { ErkannteFelder } from "@/lib/ki/erkennung"
import type { Nutzung } from "@/types"
import type { Database, Json } from "@/types/database"

type AnfrageEinfuegen = Database["public"]["Tables"]["anfragen"]["Insert"]

export type AnfrageQuelle = "mail" | "website"

// Die Herkunft der Anfrage folgt dem Eingang: ein Suchauftrag vom Website-Formular soll
// in den Anfragen auch als Website-Anfrage erscheinen, nicht als Mail.
export function anfrageQuelle(nachrichtQuelle: string | null | undefined): AnfrageQuelle {
  return nachrichtQuelle === "website" ? "website" : "mail"
}

// Kontaktangaben, die suchauftragNachricht (lib/suchauftrag.ts) unter
// erkannte_felder.kontakt ablegt; defensiv geprüft, weil jsonb alles halten kann.
const kontaktSchema = z.object({
  name: z.string(),
  email: z.string(),
  telefon: z.string().nullable().catch(null),
  nachricht: z.string().nullable().catch(null),
})

export type SuchanfrageKontakt = z.infer<typeof kontaktSchema>

export function suchanfrageKontakt(erkannteFelder: Json | null): SuchanfrageKontakt | null {
  const geprueft = z.object({ kontakt: kontaktSchema }).safeParse(erkannteFelder)
  return geprueft.success ? geprueft.data.kontakt : null
}

// Ohne von der KI erkannten Firmennamen bleibt die Absenderadresse selbst der einzige
// greifbare Bezeichner für die neu anzulegende Firmenzeile.
export function firmenName(felder: ErkannteFelder, von: string): string {
  return felder.firma ?? von
}

export function baueAnfrageEinfuegung(
  felder: ErkannteFelder,
  nutzung: Nutzung,
  firmaId: string,
  quelle: AnfrageQuelle
): AnfrageEinfuegen {
  return {
    ort: felder.ort,
    nutzung,
    flaeche_min: felder.flaeche_min,
    flaeche_max: felder.flaeche_max,
    budget_pro_m2: felder.budget_pro_m2,
    bezug: felder.bezug,
    firma_id: firmaId,
    quelle,
  }
}

// Whitelist statt eines generischen felder[feld]-Zugriffs: die Felder tragen in
// ErkannteFelder unterschiedliche Typen (Zahl, Text, Nutzung-Enum) -- ein einzelner
// indexierter Zugriff liesse sich nicht ohne any/Typumgehung in Partial<AnfrageEinfuegen>
// einsetzen. feldUebernehmen (app/actions/eingang-aktionen.ts) nutzt dieselbe Liste
// auch als Zod-Whitelist für die Nutzereingabe.
export const UEBERNEHMBARE_FELDER = ["flaeche_min", "flaeche_max", "ort", "budget_pro_m2", "bezug", "nutzung"] as const
export type UebernehmbaresFeld = (typeof UEBERNEHMBARE_FELDER)[number]

// null heisst: die KI hat für dieses Feld nichts erkannt -- nichts zu übernehmen.
export function feldUebernehmenAenderung(
  feld: UebernehmbaresFeld,
  felder: ErkannteFelder
): Partial<AnfrageEinfuegen> | null {
  if (feld === "flaeche_min") return felder.flaeche_min === null ? null : { flaeche_min: felder.flaeche_min }
  if (feld === "flaeche_max") return felder.flaeche_max === null ? null : { flaeche_max: felder.flaeche_max }
  if (feld === "ort") return felder.ort === null ? null : { ort: felder.ort }
  if (feld === "budget_pro_m2") return felder.budget_pro_m2 === null ? null : { budget_pro_m2: felder.budget_pro_m2 }
  if (feld === "bezug") return felder.bezug === null ? null : { bezug: felder.bezug }
  return felder.nutzung === null ? null : { nutzung: felder.nutzung }
}
