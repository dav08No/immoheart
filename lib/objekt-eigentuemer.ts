import { z } from "zod"

// Optionales Feld: leer (oder nur Leerzeichen) heisst "keine Adresse" statt ungültig.
export const eigentuemerEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((wert) => (wert === "" ? null : wert))
  .pipe(z.email("Die Eigentümer-E-Mail ist ungültig.").max(254).nullable())
  .nullable()

// Beim Übernehmen aus einer Mail ist der Absender i.d.R. der Eigentümer; eine
// ausdrücklich eingetragene Adresse hat Vorrang. Ungültige Absender werden ignoriert.
export function eigentuemerEmailMitHerkunft(eingetragen: string | null, herkunftVon: string | null): string | null {
  if (eingetragen) return eingetragen
  const geprueft = eigentuemerEmailSchema.safeParse(herkunftVon)
  return geprueft.success ? geprueft.data : null
}
