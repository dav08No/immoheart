"use server"

import { revalidatePath } from "next/cache"
import { legeAnfrageAn, aktualisiereAnfrage } from "@/lib/queries/anfragen"
import { berechneUndSpeichereMatchesFuerAnfrage } from "@/lib/queries/matches"
import type { Database } from "@/types/database"

type AnfrageEinfuegen = Database["public"]["Tables"]["anfragen"]["Insert"]

export async function anfrageAnlegen(anfrage: AnfrageEinfuegen): Promise<void> {
  const neue = await legeAnfrageAn(anfrage)
  await berechneUndSpeichereMatchesFuerAnfrage(neue.id)
  revalidatePath("/anfragen")
  revalidatePath("/")
}

// Nur die Felder, die tatsächlich in berechneMatch (lib/matching.ts) einfliessen,
// lösen ein Rematching aus. status, letzter_kontakt, firma_id und vertraulich
// beeinflussen den Score nicht -- ein reines Statuswechsel- oder
// Kontakt-Update (z.B. aus AnfrageDetail, Task 50) würde sonst bei jedem Klick
// erneut gegen sämtliche verfügbaren Objekte matchen (ein Query pro Objekt in
// berechneUndSpeichereMatchesFuerAnfrage), ohne dass sich am Ergebnis je etwas
// ändern könnte.
const MATCH_RELEVANTE_FELDER = [
  "flaeche_min",
  "flaeche_max",
  "ort",
  "budget_pro_m2",
  "bezug",
  "nutzung",
  "anforderungen",
] as const satisfies readonly (keyof AnfrageEinfuegen)[]

export async function anfrageAktualisieren(id: string, aenderung: Partial<AnfrageEinfuegen>): Promise<void> {
  await aktualisiereAnfrage(id, aenderung)
  if (MATCH_RELEVANTE_FELDER.some((feld) => feld in aenderung)) {
    await berechneUndSpeichereMatchesFuerAnfrage(id)
  }
  revalidatePath("/anfragen")
  revalidatePath("/")
}
