"use server"

import { revalidatePath } from "next/cache"
import { legeObjektAn, aktualisiereObjekt } from "@/lib/queries/objekte"
import { berechneUndSpeichereMatchesFuerObjekt } from "@/lib/queries/matches"
import type { Database } from "@/types/database"

type ObjektEinfuegen = Database["public"]["Tables"]["objekte"]["Insert"]

export async function objektAnlegen(objekt: ObjektEinfuegen): Promise<void> {
  const neues = await legeObjektAn(objekt)
  await berechneUndSpeichereMatchesFuerObjekt(neues.id)
  revalidatePath("/objekte")
  revalidatePath("/")
}

// Gleiches Muster wie MATCH_RELEVANTE_FELDER in app/actions/anfragen.ts (M6
// Whole-Branch-Review). zuObjektDomain (lib/queries/objekte.ts) bildet die
// Zeile auf Objekt ab, aber berechneMatch (lib/matching.ts) liest davon
// tatsächlich nur flaeche/preisProM2/ort/nutzung/eigenschaften/verfuegbarAb --
// objekt.titel taucht in zuObjektDomain auf, wird aber in keiner der
// punkteXxx/kriteriumXxx-Funktionen je gelesen. adresse, eigentuemer,
// foto_url, status und created_at fliessen gar nicht erst in zuObjektDomain
// ein. Ein reines Titel-/Foto-/Eigentümer-Update (z.B. aus ObjektFormular,
// Task 57) würde sonst bei jeder Speicherung erneut gegen sämtliche offenen
// Anfragen matchen (ein Query pro Anfrage in
// berechneUndSpeichereMatchesFuerObjekt), ohne dass sich am Ergebnis je etwas
// ändern könnte.
//
// status ist bewusst NICHT dabei: berechneUndSpeichereMatchesFuerObjekt holt
// das Objekt direkt über holeObjekt(id) (nicht gefiltert über
// holeVerfuegbareObjekte) und berechneMatch liest objekt.status gar nicht --
// ein Statuswechsel für sich allein kann das Ergebnis dieses Aufrufs also
// nicht verändern, genau wie bei anfragen.status in der Anfrage-Richtung.
const MATCH_RELEVANTE_FELDER = [
  "flaeche",
  "preis_pro_m2",
  "ort",
  "nutzung",
  "eigenschaften",
  "verfuegbar_ab",
] as const satisfies readonly (keyof ObjektEinfuegen)[]

export async function objektAktualisieren(id: string, aenderung: Partial<ObjektEinfuegen>): Promise<void> {
  await aktualisiereObjekt(id, aenderung)
  if (MATCH_RELEVANTE_FELDER.some((feld) => feld in aenderung)) {
    await berechneUndSpeichereMatchesFuerObjekt(id)
  }
  revalidatePath("/objekte")
  revalidatePath("/")
}
