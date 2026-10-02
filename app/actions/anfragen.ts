"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { legeAnfrageAn, aktualisiereAnfrage, holeAnfrage } from "@/lib/queries/anfragen"
import { berechneUndSpeichereMatchesFuerAnfrage } from "@/lib/queries/matches"
import { loescheNeueMatchesFuerAnfrage } from "@/lib/queries/angebote"
import { anfrageStatusFolge } from "@/lib/abschluss/status-wechsel"
import type { Database } from "@/types/database"

type AnfrageEinfuegen = Database["public"]["Tables"]["anfragen"]["Insert"]

export async function anfrageAnlegen(anfrage: AnfrageEinfuegen): Promise<void> {
  const neue = await legeAnfrageAn(anfrage)
  await berechneUndSpeichereMatchesFuerAnfrage(neue.id)
  revalidatePath("/admin/anfragen")
  revalidatePath("/admin")
}

// Nur die Felder, die tatsächlich in berechneMatch (lib/matching.ts) einfliessen,
// lösen ein Rematching aus. status, letzter_kontakt und firma_id beeinflussen
// den Score nicht -- ein reines Statuswechsel- oder Kontakt-Update (z.B. aus
// AnfrageDetail, Task 50) würde sonst bei jedem Klick erneut gegen sämtliche
// verfügbaren Objekte matchen (ein Query pro Objekt in
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

// Status offen/ruhend/vermittelt ist jetzt im Bearbeiten setzbar (Spec §3): ruhende und
// vermittelte Anfragen werden nicht gematcht, zurück auf offen rechnet neu. Ein manuelles
// "vermittelt" berührt bewusst kein Objekt -- dafür gibt es "Vertrag unterschrieben".
// Profil-Prüfung, weil die Aktion Treffer löschen kann; Server-Aufrufer (eingang-aktionen)
// laufen in derselben Anfrage mit Sitzung. Status explizit prüfen, da vom Client kommend.
const statusSchema = z.enum(["offen", "ruhend", "vermittelt"])

export async function anfrageAktualisieren(id: string, aenderung: Partial<AnfrageEinfuegen>): Promise<void> {
  await holeEigenesProfil()
  if (aenderung.status !== undefined && !statusSchema.safeParse(aenderung.status).success) {
    throw new Error("Ungültiger Status")
  }
  const vorher = await holeAnfrage(id)
  if (!vorher) throw new Error("Anfrage nicht gefunden")
  await aktualisiereAnfrage(id, aenderung)
  const suchfelderGeaendert = MATCH_RELEVANTE_FELDER.some((feld) => feld in aenderung)
  const folge = anfrageStatusFolge(vorher.status, aenderung.status ?? vorher.status, suchfelderGeaendert)
  if (folge === "rematch") await berechneUndSpeichereMatchesFuerAnfrage(id)
  if (folge === "neu_loeschen") await loescheNeueMatchesFuerAnfrage(id)
  revalidatePath("/admin/anfragen")
  revalidatePath("/admin")
}
