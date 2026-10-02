"use server"

import { z } from "zod"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { aktualisiereNachricht, holeNachricht, verknuepfeDankEntwurfMitObjekt } from "@/lib/queries/nachrichten"
import { holeAnfrage } from "@/lib/queries/anfragen"
import { holeObjekt } from "@/lib/queries/objekte"
import { anfrageAktualisieren } from "@/app/actions/anfragen"
import { feldUebernehmenAenderung, UEBERNEHMBARE_FELDER } from "@/lib/eingang/anfrage-aus-eingang"
import type { ErkannteFelder } from "@/lib/ki/erkennung"
import { NutzerFehler } from "@/lib/nutzer-fehler"
import { idSchema, pfadeNeuLaden, type Ergebnis } from "@/app/actions/entwuerfe-hilfen"

// Manuelle Zuordnung, wenn die automatische Verlauf-/Absender-Zuordnung
// (lib/eingang/zuordnung.ts) beim Verarbeiten keine eindeutige Anfrage fand -- das
// Postfach bietet dafür "Anfrage zuordnen" mit Auswahl aus den offenen Anfragen.
export async function anfrageZuordnen(nachrichtId: string, anfrageId: string): Promise<Ergebnis> {
  await holeEigenesProfil()
  try {
    const nId = idSchema.parse(nachrichtId)
    const aId = idSchema.parse(anfrageId)
    const nachricht = await holeNachricht(nId)
    if (!nachricht || nachricht.richtung !== "eingang") throw new NutzerFehler("Nachricht nicht gefunden.")
    if (!(await holeAnfrage(aId))) throw new NutzerFehler("Anfrage nicht gefunden.")

    await aktualisiereNachricht(nId, { anfrage_id: aId, kategorie: "antwort" })
    await anfrageAktualisieren(aId, { letzter_kontakt: new Date().toISOString() })
    pfadeNeuLaden()
    return { fehler: null }
  } catch (e) {
    if (e instanceof NutzerFehler) return { fehler: e.message }
    throw e
  }
}

// Wie anfrageZuordnen, für Objektmeldungen ohne eindeutige Zuordnung (weder Verlauf
// noch genau ein aktives Objekt des Absenders). Setzt nur den Bezug (Meldung und offener
// Dank-Entwurf), keinen Status.
export async function objektZuordnen(nachrichtId: string, objektId: string): Promise<Ergebnis> {
  await holeEigenesProfil()
  try {
    const nId = idSchema.parse(nachrichtId)
    const oId = idSchema.parse(objektId)
    const nachricht = await holeNachricht(nId)
    if (!nachricht || nachricht.richtung !== "eingang") throw new NutzerFehler("Nachricht nicht gefunden.")
    if (nachricht.kategorie !== "objektmeldung") throw new NutzerFehler("Nur Objektmeldungen lassen sich einem Objekt zuordnen.")
    if (!(await holeObjekt(oId))) throw new NutzerFehler("Objekt nicht gefunden.")

    await aktualisiereNachricht(nId, { objekt_id: oId })
    await verknuepfeDankEntwurfMitObjekt(nId, oId)
    pfadeNeuLaden()
    return { fehler: null }
  } catch (e) {
    if (e instanceof NutzerFehler) return { fehler: e.message }
    throw e
  }
}

const feldSchema = z.enum(UEBERNEHMBARE_FELDER)

// Übernimmt einen einzelnen von der KI erkannten Wert einer Antwort-Mail in die
// bereits zugeordnete Anfrage -- z.B. wenn die Firma in einer Antwort ein neues
// Budget nennt. anfrageAktualisieren löst dabei bei Bedarf ein Rematching aus.
export async function feldUebernehmen(nachrichtId: string, feld: string): Promise<Ergebnis> {
  await holeEigenesProfil()
  try {
    const nId = idSchema.parse(nachrichtId)
    const geprueft = feldSchema.safeParse(feld)
    if (!geprueft.success) throw new NutzerFehler("Unbekanntes Feld.")

    const nachricht = await holeNachricht(nId)
    if (!nachricht || nachricht.kategorie !== "antwort" || !nachricht.anfrage_id) {
      throw new NutzerFehler("Kein Feld zum Übernehmen vorhanden.")
    }

    const felder = nachricht.erkannte_felder as ErkannteFelder | null
    const aenderung = felder ? feldUebernehmenAenderung(geprueft.data, felder) : null
    if (!aenderung) throw new NutzerFehler("Für dieses Feld wurde nichts erkannt.")

    await anfrageAktualisieren(nachricht.anfrage_id, aenderung)
    pfadeNeuLaden()
    return { fehler: null }
  } catch (e) {
    if (e instanceof NutzerFehler) return { fehler: e.message }
    throw e
  }
}

export async function alsGelesenMarkieren(id: string): Promise<Ergebnis> {
  await holeEigenesProfil()
  try {
    await aktualisiereNachricht(idSchema.parse(id), { gelesen: true })
    pfadeNeuLaden()
    return { fehler: null }
  } catch (e) {
    if (e instanceof NutzerFehler) return { fehler: e.message }
    throw e
  }
}
