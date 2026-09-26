import { z } from "zod"

export const neuesKontoSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  darfNutzerAnlegen: z.boolean(),
})

export type KontoStatus = "eingeladen" | "aktiv" | "deaktiviert"

export function kontoStatus(aktiv: boolean, letzteAnmeldung: string | null): KontoStatus {
  if (!aktiv) return "deaktiviert"
  return letzteAnmeldung ? "aktiv" : "eingeladen"
}

export function deaktivierenVerboten(p: {
  zielUserId: string
  eigeneUserId: string
  zielHatRecht: boolean
  aktiveMitRecht: number
}): string | null {
  if (p.zielUserId === p.eigeneUserId) return "Das eigene Konto kann nicht deaktiviert werden."
  if (p.zielHatRecht && p.aktiveMitRecht <= 1) {
    return "Das letzte Konto mit Recht zur Nutzerverwaltung kann nicht deaktiviert werden."
  }
  return null
}

export function rechtEntzugVerboten(p: {
  zielUserId: string
  eigeneUserId: string
  aktiveMitRecht: number
  zielIstAktiv: boolean
}): string | null {
  if (p.zielUserId === p.eigeneUserId) return "Das eigene Recht kann nicht entzogen werden."
  if (p.zielIstAktiv && p.aktiveMitRecht <= 1) return "Das letzte Konto mit Recht zur Nutzerverwaltung behält das Recht."
  return null
}
