// Öffentliches Objektanfrage-Formular: Schema + reine Textbausteine für Eingang
// und Antwort-Entwurf. Kein Versand hier -- der Server Action verdrahtet DB und
// Formularschutz (Konstraints N5: "Website-Einträge erzeugen nur Entwürfe").
import { z } from "zod"
import type { Database } from "@/types/database"

type NachrichtEinfuegen = Database["public"]["Tables"]["nachrichten"]["Insert"]

const EMAIL_MELDUNG = "Bitte geben Sie eine gültige E-Mail-Adresse an."

export const objektanfrageSchema = z.object({
  firma: z.string().trim().min(1, "Bitte geben Sie Ihre Firma an.").max(120, "Höchstens 120 Zeichen."),
  name: z.string().trim().min(1, "Bitte geben Sie Ihren Namen an.").max(120, "Höchstens 120 Zeichen."),
  email: z.string().trim().toLowerCase().pipe(z.email(EMAIL_MELDUNG).max(200, EMAIL_MELDUNG)),
  // Ziffern, +, Leerzeichen, Klammern, Bindestrich, Schrägstrich -- keine Buchstaben.
  // Ein leeres Feld ("") wird zu undefined -- das Formular liefert "" statt fehlendem
  // Feld, wenn die Nutzerin nichts einträgt.
  telefon: z
    .string()
    .trim()
    .max(40, "Höchstens 40 Zeichen.")
    .regex(/^[0-9+\s()/-]*$/, "Bitte nur Ziffern, +, Leerzeichen, Klammern, / und - verwenden.")
    .optional()
    .transform((wert) => (wert === "" ? undefined : wert)),
  nachricht: z.string().trim().min(1, "Bitte schreiben Sie eine Nachricht.").max(2000, "Höchstens 2000 Zeichen."),
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
