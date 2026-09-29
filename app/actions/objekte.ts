"use server"

import { revalidatePath } from "next/cache"
import { idSchema } from "@/app/actions/entwuerfe-hilfen"
import { legeObjektAn, aktualisiereObjekt } from "@/lib/queries/objekte"
import { holeNachricht, verknuepfeObjektMitEingang } from "@/lib/queries/nachrichten"
import { berechneUndSpeichereMatchesFuerObjekt } from "@/lib/queries/matches"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { MAX_BESCHREIBUNG } from "@/lib/objekt-fotos"
import { NutzerFehler } from "@/lib/nutzer-fehler"
import { istUebernehmbarerEingang } from "@/lib/objekt-vorbelegung"
import { eigentuemerEmailMitHerkunft, eigentuemerEmailSchema } from "@/lib/objekt-eigentuemer"
import type { Database } from "@/types/database"

type ObjektEinfuegen = Database["public"]["Tables"]["objekte"]["Insert"]

// Das Formular begrenzt bereits per maxLength; hier gegen direkte Action-Aufrufe.
function pruefeBeschreibung(objekt: Partial<ObjektEinfuegen>) {
  if ((objekt.beschreibung?.length ?? 0) > MAX_BESCHREIBUNG) {
    throw new NutzerFehler(`Die Beschreibung ist länger als ${MAX_BESCHREIBUNG} Zeichen.`)
  }
}

// Gegen direkte Action-Aufrufe: leer → null, sonst gültige, kleingeschriebene Adresse.
function pruefeEigentuemerEmail(wert: string | null | undefined): string | null {
  const geprueft = eigentuemerEmailSchema.safeParse(wert ?? null)
  if (!geprueft.success) throw new NutzerFehler("Die Eigentümer-E-Mail ist ungültig.")
  return geprueft.data
}

// Öffentliche Liste und Detailseiten zeigen Titel, Beschreibung und Sichtbarkeit mit.
function oeffentlicheSeitenNeuLaden() {
  revalidatePath("/objekte")
  revalidatePath("/objekte/[id]", "page")
}

// Ruling R3 (Task 7): objektAnlegen bleibt void. herkunftNachrichtId ist nur die
// optionale Brücke zurück zur Mail, aus der das Objekt übernommen wurde (Link "Als
// Objekt übernehmen" im Postfach, ?aus=<Eingangs-id>) -- kein Teil des Objekts selbst,
// deshalb ein eigener Parameter statt eines Felds in ObjektEinfuegen.
export async function objektAnlegen(objekt: ObjektEinfuegen, herkunftNachrichtId?: string): Promise<void> {
  await holeEigenesProfil()
  pruefeBeschreibung(objekt)
  const herkunftId = herkunftNachrichtId ? idSchema.safeParse(herkunftNachrichtId) : null
  const herkunft = herkunftId?.success ? await holeNachricht(herkunftId.data) : null
  // Leeres Feld: Absender der Herkunftsmail übernehmen, aber nur aus einem Objektangebot.
  const herkunftVon = herkunft && istUebernehmbarerEingang(herkunft) ? herkunft.von : null
  const eigentuemer_email = eigentuemerEmailMitHerkunft(pruefeEigentuemerEmail(objekt.eigentuemer_email), herkunftVon)
  const neues = await legeObjektAn({ ...objekt, eigentuemer_email })
  await berechneUndSpeichereMatchesFuerObjekt(neues.id)
  if (herkunftId?.success) await verknuepfeObjektMitEingang(herkunftId.data, neues.id)
  revalidatePath("/admin/objekte")
  revalidatePath("/admin")
  revalidatePath("/admin/postfach")
  oeffentlicheSeitenNeuLaden()
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
  await holeEigenesProfil()
  pruefeBeschreibung(aenderung)
  const geprueft =
    "eigentuemer_email" in aenderung ? { ...aenderung, eigentuemer_email: pruefeEigentuemerEmail(aenderung.eigentuemer_email) } : aenderung
  await aktualisiereObjekt(id, geprueft)
  if (MATCH_RELEVANTE_FELDER.some((feld) => feld in aenderung)) {
    await berechneUndSpeichereMatchesFuerObjekt(id)
  }
  revalidatePath("/admin/objekte")
  revalidatePath("/admin")
  oeffentlicheSeitenNeuLaden()
}
