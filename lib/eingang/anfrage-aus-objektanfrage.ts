// Reine Ableitungen für Objektanfragen von der Website (kein DB-Zugriff): aus dem
// angefragten Objekt und den Formularangaben wird eine Anfrage samt Firma. Auch im
// Browser nutzbar (AktionenObjektanfrage liest damit die erkannten Felder).
import { z } from "zod"
import type { Database, Json } from "@/types/database"

type Tabellen = Database["public"]["Tables"]
type AnfrageEinfuegen = Tabellen["anfragen"]["Insert"]
type FirmaEinfuegen = Tabellen["firmen"]["Insert"]
type ObjektRow = Tabellen["objekte"]["Row"]

// Gleiche Form, wie objektanfrageNachricht (lib/website-eintrag.ts) sie schreibt; defensiv
// geprüft, weil erkannte_felder als jsonb alles halten kann.
const objektanfrageFelderSchema = z.object({
  firma: z.string(),
  name: z.string(),
  email: z.string(),
  telefon: z.string().nullable().catch(null),
  nachricht: z.string(),
})

export type ObjektanfrageFelder = z.infer<typeof objektanfrageFelderSchema>

export function objektanfrageFelder(erkannteFelder: Json | null): ObjektanfrageFelder | null {
  const geprueft = objektanfrageFelderSchema.safeParse(erkannteFelder)
  return geprueft.success ? geprueft.data : null
}

export function objektanfrageFirma(felder: ObjektanfrageFelder): FirmaEinfuegen {
  return {
    // Ohne Firmenname bleibt die Adresse der einzige greifbare Bezeichner (wie firmenName).
    name: felder.firma.trim() || felder.email,
    kontakt_name: felder.name.trim() || null,
    kontakt_email: felder.email.toLowerCase(),
  }
}

// Die Anfrage sucht genau dieses Objekt: Ort, Nutzung und Fläche stammen daher vom
// Objekt selbst, damit das Matching es sicher als Treffer findet.
export function baueObjektanfrageEinfuegung(
  objekt: Pick<ObjektRow, "id" | "ort" | "nutzung" | "flaeche">,
  firmaId: string
): AnfrageEinfuegen {
  return {
    ort: objekt.ort,
    nutzung: objekt.nutzung,
    flaeche_min: objekt.flaeche,
    flaeche_max: objekt.flaeche,
    firma_id: firmaId,
    quelle: "website",
    objekt_id: objekt.id,
  }
}
