"use server"

import { revalidatePath } from "next/cache"
import type { ErkannteFelder } from "@/lib/ki/erkennung"
import type { Nutzung } from "@/types"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { holeNachricht, setzeAnfrageIdFallsLeer, verknuepfeAntwortenMitAnfrage } from "@/lib/queries/nachrichten"
import { legeAnfrageAn, loescheAnfrage } from "@/lib/queries/anfragen"
import { holeFirmaPerEmail, legeFirmaAn, loescheFirmaFallsUnbenutzt } from "@/lib/queries/firmen"
import { berechneUndSpeichereMatchesFuerAnfrage } from "@/lib/queries/matches"
import { baueAnfrageEinfuegung, firmenName } from "@/lib/eingang/anfrage-aus-eingang"
import { NutzerFehler } from "@/lib/nutzer-fehler"
import { idSchema, type Ergebnis } from "@/app/actions/entwuerfe-hilfen"

// Firma per Absenderadresse wiederverwenden statt bei jeder Mail derselben Firma eine
// neue Zeile anzulegen. neuAngelegt wird an den Doppelklick-Rollback unten
// durchgereicht: nur eine hier selbst frisch angelegte Firma darf beim Verlust der
// Race überhaupt zur Löschung in Frage kommen, eine wiederverwendete nie.
async function firmaFuerEingang(von: string, felder: ErkannteFelder): Promise<{ id: string; neuAngelegt: boolean }> {
  const bestehende = await holeFirmaPerEmail(von)
  if (bestehende) return { id: bestehende.id, neuAngelegt: false }
  const neue = await legeFirmaAn({ name: firmenName(felder, von), branche: felder.branche, kontakt_email: von })
  return { id: neue.id, neuAngelegt: true }
}

export async function alsAnfrageSpeichern(nachrichtId: string, nutzungUeberschreibung?: Nutzung): Promise<Ergebnis> {
  await holeEigenesProfil()
  try {
    const eingang = await holeNachricht(idSchema.parse(nachrichtId))
    if (!eingang) throw new NutzerFehler("Nachricht nicht gefunden.")
    if (eingang.anfrage_id || (eingang.kategorie !== "suchanfrage" && eingang.kategorie !== null)) {
      throw new NutzerFehler("Diese Nachricht wurde bereits verarbeitet.")
    }

    const felder = eingang.erkannte_felder as ErkannteFelder | null
    if (!felder) throw new NutzerFehler("Diese Nachricht hat keine erkannten Felder.")

    // KEIN stiller Rateschritt bei fehlender nutzung: berechneMatch schliesst mit
    // einem harten Gate (anfrage.nutzung !== objekt.nutzung -> null) jede Anfrage mit
    // falscher nutzung dauerhaft und ohne Fehlermeldung vom Matching aus. Die von der
    // Nutzerin in EingangDetail gewählte nutzungUeberschreibung gilt deshalb nur, wenn
    // die KI selbst nichts erkannt hat -- felder.nutzung hat immer Vorrang und wird
    // NICHT zurückgeschrieben, damit erkannte_felder die tatsächliche KI-Erkennung bleibt.
    const nutzung = felder.nutzung ?? nutzungUeberschreibung
    if (!nutzung) {
      throw new NutzerFehler(
        "Nutzung konnte nicht erkannt werden. Bitte Nutzung manuell bestimmen, bevor die Anfrage gespeichert wird."
      )
    }

    const firma = await firmaFuerEingang(eingang.von, felder)
    const neue = await legeAnfrageAn(baueAnfrageEinfuegung(felder, nutzung, firma.id))

    // Doppelklick-Schutz: nur der Aufruf, der die noch leere anfrage_id trifft, gewinnt --
    // ein zweiter, überlappender Aufruf für dieselbe Nachricht muss seine eigene, gerade
    // erst angelegte Anfrage wieder verwerfen statt eine Dublette stehen zu lassen.
    const uebernommen = await setzeAnfrageIdFallsLeer(eingang.id, neue.id)
    if (!uebernommen) {
      await loescheAnfrage(neue.id)
      // Nur aufräumen, wenn WIR die Firma gerade erst angelegt haben (siehe
      // firmaFuerEingang) -- eine wiederverwendete, bereits vorher existierende Firma
      // wird nie gelöscht. loescheFirmaFallsUnbenutzt prüft zusätzlich selbst, ob der
      // GEWINNER der Race dieselbe Firma inzwischen über holeFirmaPerEmail
      // übernommen hat, und lässt sie in dem Fall stehen. Ein Fehler beim Aufräumen
      // darf den eigentlichen, für die Nutzerin bereits feststehenden Fehlerfall
      // ("bereits verarbeitet") nicht überdecken -- nur loggen, nicht werfen.
      if (firma.neuAngelegt) {
        try {
          await loescheFirmaFallsUnbenutzt(firma.id)
        } catch (aufraeumFehler) {
          console.error("alsAnfrageSpeichern: verwaiste Firma konnte nicht aufgeräumt werden", firma.id, aufraeumFehler)
        }
      }
      throw new NutzerFehler("Diese Nachricht wurde bereits verarbeitet.")
    }

    // Rückfrage-Entwürfe (und bereits gesendete Rückfragen) zu diesem Eingang auf die
    // neue Anfrage umhängen, damit Senden letzter_kontakt pflegt und Folgemails der
    // Firma über den Verlauf wieder bei dieser Anfrage landen.
    await verknuepfeAntwortenMitAnfrage(eingang.id, neue.id)
    await berechneUndSpeichereMatchesFuerAnfrage(neue.id)

    revalidatePath("/admin/postfach")
    revalidatePath("/admin/anfragen")
    revalidatePath("/admin", "layout")
    return { fehler: null }
  } catch (e) {
    if (e instanceof NutzerFehler) return { fehler: e.message }
    throw e
  }
}
