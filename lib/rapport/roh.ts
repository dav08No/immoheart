// Rohzeilen des Jahresrapports, so wie lib/queries/rapport.ts sie lädt. Bewusst nur
// Spalten ohne Personendaten: keine E-Mails, Kontakte, Eigentümer oder Mailtexte.
import type { Database } from "@/types/database"

type Zeile<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]

export type RohAnfrage = Pick<
  Zeile<"anfragen">,
  "id" | "firma_id" | "created_at" | "quelle" | "status" | "nutzung" | "flaeche_min" | "flaeche_max" | "ort" | "budget_pro_m2" | "archiviert_am"
>
export type RohObjekt = Pick<
  Zeile<"objekte">,
  "id" | "titel" | "ort" | "flaeche" | "preis_pro_m2" | "nutzung" | "status" | "created_at" | "archiviert_am"
>
export type RohFirma = Pick<Zeile<"firmen">, "id" | "name">
export type RohTreffer = Pick<
  Zeile<"matches">,
  "id" | "anfrage_id" | "objekt_id" | "status" | "score" | "created_at" | "angeboten_am" | "abgeschlossen_am"
>
export type RohArchivTreffer = Pick<
  Zeile<"treffer_archiv">,
  "id" | "match_id" | "anfrage_id" | "objekt_id" | "status" | "score" | "treffer_erstellt_am" | "abgeschlossen_am" | "archiviert_am" | "grund"
>
// Gesendete Angebots-Mail (nachrichten typ angebot, richtung gesendet).
export type RohAngebot = Pick<Zeile<"nachrichten">, "match_id" | "anfrage_id" | "objekt_id" | "gesendet_am">

export type RapportRohdaten = {
  // Anfragen, Objekte und Firmen vollständig: sie dienen auch als Namens-Nachschlagetabellen
  // für Treffer und Angebote, deren Anfrage/Objekt vor dem Zeitraum entstand.
  anfragen: RohAnfrage[]
  objekte: RohObjekt[]
  firmen: RohFirma[]
  treffer: RohTreffer[]
  trefferArchiv: RohArchivTreffer[]
  angebote: RohAngebot[]
}

export const LEERE_ROHDATEN: RapportRohdaten = { anfragen: [], objekte: [], firmen: [], treffer: [], trefferArchiv: [], angebote: [] }
