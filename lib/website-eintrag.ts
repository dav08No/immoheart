// Öffentliches Objektanfrage-Formular: Schema + reine Textbausteine für Eingang
// und Antwort-Entwurf. Kein Versand hier -- der Server Action verdrahtet DB und
// Formularschutz (Konstraints N5: "Website-Einträge erzeugen nur Entwürfe").
import { z } from "zod"
import type { Database } from "@/types/database"

type NachrichtEinfuegen = Database["public"]["Tables"]["nachrichten"]["Insert"]

export const objektanfrageSchema = z.object({
  firma: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email().max(200)),
  // Ziffern, +, Leerzeichen, Klammern, Bindestrich, Schrägstrich -- keine Buchstaben.
  telefon: z
    .string()
    .trim()
    .max(40)
    .regex(/^[0-9+\s()/-]*$/)
    .optional(),
  nachricht: z.string().trim().min(1).max(2000),
  objektId: z.uuid(),
})

export type Objektanfrage = z.infer<typeof objektanfrageSchema>

function anfrageZeilen(a: Objektanfrage, objektTitel: string): string[] {
  return [
    `Objekt: ${objektTitel}`,
    `Firma: ${a.firma}`,
    `Name: ${a.name}`,
    `E-Mail: ${a.email}`,
    `Telefon: ${a.telefon ?? "-"}`,
    "",
    a.nachricht,
  ]
}

export function objektanfrageNachricht(a: Objektanfrage, objektTitel: string, an: string): NachrichtEinfuegen {
  return {
    richtung: "eingang",
    typ: "anfrage",
    quelle: "website",
    kategorie: "objektanfrage",
    ki_status: "fertig",
    gelesen: false,
    von: a.email,
    an,
    betreff: `Objektanfrage: ${objektTitel}`,
    body: anfrageZeilen(a, objektTitel).join("\n"),
    objekt_id: a.objektId,
    erkannte_felder: {
      firma: a.firma,
      name: a.name,
      email: a.email,
      telefon: a.telefon ?? null,
      nachricht: a.nachricht,
    },
  }
}

export function objektanfrageEntwurf(a: Objektanfrage, objektTitel: string): { betreff: string; body: string } {
  const body = [
    `Guten Tag ${a.name}`,
    "",
    `Vielen Dank für Ihr Interesse an "${objektTitel}".`,
    "Gerne senden wir Ihnen weitere Unterlagen zu oder vereinbaren mit Ihnen einen Besichtigungstermin.",
    "Haben Sie bereits einen Wunschtermin für eine Besichtigung?",
    "",
    "Freundliche Grüsse",
    "immoheart",
  ].join("\n")
  return { betreff: `Re: Objektanfrage: ${objektTitel}`, body }
}
