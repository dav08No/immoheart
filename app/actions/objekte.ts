"use server"

import { revalidatePath } from "next/cache"
import { legeObjektAn, aktualisiereObjekt } from "@/lib/queries/objekte"
import { berechneUndSpeichereMatchesFuerObjekt } from "@/lib/queries/matches"
import type { Database } from "@/types/database"

type ObjektEinfuegen = Database["public"]["Tables"]["objekte"]["Insert"]

export async function objektAnlegen(objekt: ObjektEinfuegen): Promise<void> {
  const neues = await legeObjektAn(objekt)
  await berechneUndSpeichereMatchesFuerObjekt(neues.id)
  revalidatePath("/admin/objekte")
  revalidatePath("/admin")
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
// status ist seit dem M7 Whole-Branch-Review-Fix in matches.ts bewusst DABEI
// (anders als zuvor angenommen): berechneUndSpeichereMatchesFuerObjekt sperrt
// dort inzwischen selbst gegen ein Nicht-verfuegbar-Objekt und räumt dessen
// bestehende status='neu'-Matches auf, sobald es den Status wechselt (Kritischer
// Fund, siehe Kommentar dort). Ein reiner Statuswechsel -- ohne dass sich ein
// anderes hier gelistetes Feld ändert -- muss also weiterhin einen Aufruf
// auslösen, sonst bliebe genau diese Aufräumung aus. berechneMatch selbst
// liest objekt.status zwar nach wie vor nicht (der Status wirkt nur als Gate
// VOR der eigentlichen Match-Berechnung, nicht als deren Eingabe).
const MATCH_RELEVANTE_FELDER = [
  "flaeche",
  "preis_pro_m2",
  "ort",
  "nutzung",
  "eigenschaften",
  "verfuegbar_ab",
  "status",
] as const satisfies readonly (keyof ObjektEinfuegen)[]

export async function objektAktualisieren(id: string, aenderung: Partial<ObjektEinfuegen>): Promise<void> {
  await aktualisiereObjekt(id, aenderung)
  if (MATCH_RELEVANTE_FELDER.some((feld) => feld in aenderung)) {
    await berechneUndSpeichereMatchesFuerObjekt(id)
  }
  revalidatePath("/admin/objekte")
  revalidatePath("/admin")
}
