// Helfer für alsAnfrageSpeichern (nachrichten.ts), ausgelagert wegen der Dateigrösse.
// Kein "use server": diese Funktionen dürfen nicht als eigene Actions aufrufbar sein.
import "server-only"
import type { ErkannteFelder } from "@/lib/ki/erkennung"
import type { Nutzung } from "@/types"
import type { Database } from "@/types/database"
import type { NachrichtRow } from "@/lib/queries/nachrichten"
import { ergaenzeKontaktName, holeFirmaPerEmail, legeFirmaAn } from "@/lib/queries/firmen"
import { holeObjekt } from "@/lib/queries/objekte"
import { baueAnfrageEinfuegung, firmenName } from "@/lib/eingang/anfrage-aus-eingang"
import { baueObjektanfrageEinfuegung, objektanfrageFelder, objektanfrageFirma } from "@/lib/eingang/anfrage-aus-objektanfrage"
import { NutzerFehler } from "@/lib/nutzer-fehler"

type Tabellen = Database["public"]["Tables"]

export type FirmaWahl = { id: string; neuAngelegt: boolean }
export type VorbereiteteAnfrage = { firma: FirmaWahl; einfuegung: Tabellen["anfragen"]["Insert"] }

// Firma per Adresse wiederverwenden statt bei jeder Mail derselben Firma eine neue Zeile
// anzulegen. neuAngelegt geht an den Doppelklick-Rollback: nur eine hier frisch angelegte
// Firma darf beim Verlust der Race überhaupt zur Löschung in Frage kommen.
// Bei Wiederverwendung wird nur ein fehlender Kontaktname ergänzt, sonst nichts geändert.
async function firmaFuer(email: string, neu: () => Tabellen["firmen"]["Insert"]): Promise<FirmaWahl> {
  const bestehende = await holeFirmaPerEmail(email)
  if (bestehende) {
    const kontaktName = neu().kontakt_name
    if (bestehende.kontakt_name === null && kontaktName) await ergaenzeKontaktName(bestehende.id, kontaktName)
    return { id: bestehende.id, neuAngelegt: false }
  }
  const angelegt = await legeFirmaAn(neu())
  return { id: angelegt.id, neuAngelegt: true }
}

export async function suchanfrageVorbereiten(
  eingang: NachrichtRow,
  nutzungUeberschreibung: Nutzung | undefined
): Promise<VorbereiteteAnfrage> {
  const felder = eingang.erkannte_felder as ErkannteFelder | null
  if (!felder) throw new NutzerFehler("Diese Nachricht hat keine erkannten Felder.")

  // KEIN stiller Rateschritt bei fehlender nutzung: berechneMatch schliesst mit einem
  // harten Gate (anfrage.nutzung !== objekt.nutzung -> null) jede Anfrage mit falscher
  // nutzung dauerhaft vom Matching aus. Die Überschreibung aus EingangDetail gilt nur,
  // wenn die KI nichts erkannt hat; erkannte_felder bleibt die tatsächliche Erkennung.
  const nutzung = felder.nutzung ?? nutzungUeberschreibung
  if (!nutzung) {
    throw new NutzerFehler(
      "Nutzung konnte nicht erkannt werden. Bitte Nutzung manuell bestimmen, bevor die Anfrage gespeichert wird."
    )
  }

  const firma = await firmaFuer(eingang.von, () => ({
    name: firmenName(felder, eingang.von),
    branche: felder.branche,
    kontakt_email: eingang.von,
  }))
  return { firma, einfuegung: baueAnfrageEinfuegung(felder, nutzung, firma.id) }
}

// Das Objekt wird erst jetzt gelesen: es kann seit der Website-Anfrage geändert oder
// gelöscht worden sein (objekt_id wird beim Löschen null).
export async function objektanfrageVorbereiten(eingang: NachrichtRow): Promise<VorbereiteteAnfrage> {
  const felder = objektanfrageFelder(eingang.erkannte_felder)
  if (!felder) throw new NutzerFehler("Diese Nachricht hat keine erkannten Felder.")
  const objekt = eingang.objekt_id ? await holeObjekt(eingang.objekt_id) : null
  if (!objekt) throw new NutzerFehler("Das angefragte Objekt existiert nicht mehr.")

  const neueFirma = objektanfrageFirma(felder)
  const firma = await firmaFuer(felder.email, () => neueFirma)
  return { firma, einfuegung: baueObjektanfrageEinfuegung(objekt, firma.id) }
}
