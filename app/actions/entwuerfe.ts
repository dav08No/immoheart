"use server"

import { revalidatePath } from "next/cache"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { aktualisiereNachricht, holeNachricht, legeNachrichtAn } from "@/lib/queries/nachrichten"
import { gibFestsitzendeReservierungFrei, markiereAlsManuellGesendet } from "@/lib/queries/versand"
import { aktualisiereAnfrage } from "@/lib/queries/anfragen"
import { markiereMatchAngeboten } from "@/lib/queries/matches"
import { entwurfSchema, type EntwurfEingabe } from "@/lib/entwurf-schema"
import { istReservierungAbgelaufen } from "@/lib/entwurf-status"
import { NutzerFehler } from "@/lib/nutzer-fehler"
import { idSchema, offenerEntwurf, pfadeNeuLaden, type Ergebnis } from "@/app/actions/entwuerfe-hilfen"

export async function entwurfSpeichern(id: string, eingabe: EntwurfEingabe): Promise<Ergebnis> {
  await holeEigenesProfil()
  try {
    await offenerEntwurf(id)
    const geprueft = entwurfSchema.safeParse(eingabe)
    if (!geprueft.success) throw new NutzerFehler("Bitte gültige Empfängeradresse, Betreff und Text angeben.")
    await aktualisiereNachricht(id, { ...geprueft.data, versand_fehler: null })
    pfadeNeuLaden()
    return { fehler: null }
  } catch (e) {
    if (e instanceof NutzerFehler) return { fehler: e.message }
    throw e
  }
}

export async function entwurfLoeschen(id: string): Promise<Ergebnis> {
  await holeEigenesProfil()
  try {
    await offenerEntwurf(id)
    await aktualisiereNachricht(id, { geloescht_am: new Date().toISOString() })
    pfadeNeuLaden()
    return { fehler: null }
  } catch (e) {
    if (e instanceof NutzerFehler) return { fehler: e.message }
    throw e
  }
}

// Gegenstück zu offenerEntwurf: die einzige Aktion, die auf einem GERADE
// reservierten Entwurf ("Versand unklar") arbeiten darf. Der Alters-Check
// (istReservierungAbgelaufen) läuft hier zusätzlich zur DB-Bedingung in
// gibFestsitzendeReservierungFrei (lib/queries/versand.ts) -- so bekommt die
// Nutzerin die passende Meldung, ohne dass ein unnötiger Schreibversuch
// unternommen wird, wenn der Versand offensichtlich noch läuft.
export async function reservierungFreigeben(id: string): Promise<Ergebnis> {
  await holeEigenesProfil()
  try {
    const geprueft = idSchema.parse(id)
    const entwurf = await holeNachricht(geprueft)
    if (!entwurf || entwurf.richtung !== "entwurf" || entwurf.gesendet_am === null || entwurf.geloescht_am !== null) {
      throw new NutzerFehler("Dieser Entwurf ist nicht reserviert.")
    }
    if (!istReservierungAbgelaufen(entwurf.gesendet_am, new Date())) {
      throw new NutzerFehler("Der Versand läuft möglicherweise noch. Bitte in zwei Minuten erneut prüfen.")
    }
    await gibFestsitzendeReservierungFrei(geprueft)
    pfadeNeuLaden()
    return { fehler: null }
  } catch (e) {
    if (e instanceof NutzerFehler) return { fehler: e.message }
    throw e
  }
}

// Weg raus, wenn die Mail laut Gmail-Ordner "Gesendet" tatsächlich rausgegangen ist,
// obwohl markiereGesendet (entwurfSenden) den Status nicht mehr speichern konnte.
// markiereAlsManuellGesendet (lib/queries/versand.ts) prüft selbst die 2-Minuten-Grenze
// und wirft dort bereits die passende NutzerFehler-Meldung -- kein zusätzlicher Check hier.
export async function alsGesendetMarkieren(id: string): Promise<Ergebnis> {
  await holeEigenesProfil()
  try {
    const geprueft = idSchema.parse(id)
    const aktualisiert = await markiereAlsManuellGesendet(geprueft)

    // Best-effort wie in entwurfSenden: das Komfort-Feld letzter_kontakt darf bei
    // einem Fehler nicht als Fehlschlag der eigentlichen Aktion angezeigt werden.
    if (aktualisiert.anfrage_id) {
      try {
        await aktualisiereAnfrage(aktualisiert.anfrage_id, { letzter_kontakt: new Date().toISOString() })
        revalidatePath("/admin/anfragen")
      } catch (fehler) {
        console.error("aktualisiereAnfrage fehlgeschlagen nach alsGesendetMarkieren", fehler)
      }
    }
    // Wie entwurfSenden: das Angebot ist raus, der Treffer gilt als angeboten. Sonst bliebe er
    // 'neu' und böte "Angebot entwerfen" erneut an (Doppel-Angebot).
    if (aktualisiert.match_id) {
      try {
        await markiereMatchAngeboten(aktualisiert.match_id)
      } catch (fehler) {
        console.error("markiereMatchAngeboten fehlgeschlagen nach alsGesendetMarkieren", fehler)
      }
    }
    pfadeNeuLaden()
    return { fehler: null }
  } catch (e) {
    if (e instanceof NutzerFehler) return { fehler: e.message }
    throw e
  }
}

export async function neueMail(eingabe: EntwurfEingabe & { anfrageId?: string }): Promise<{ id: string | null; fehler: string | null }> {
  await holeEigenesProfil()
  try {
    const geprueft = entwurfSchema.safeParse(eingabe)
    if (!geprueft.success) throw new NutzerFehler("Bitte gültige Empfängeradresse, Betreff und Text angeben.")
    const anfrageId = eingabe.anfrageId ? idSchema.parse(eingabe.anfrageId) : null
    const neu = await legeNachrichtAn({
      richtung: "entwurf",
      typ: "frei",
      anfrage_id: anfrageId,
      von: process.env.GMAIL_USER ?? "",
      ...geprueft.data,
    })
    pfadeNeuLaden()
    return { id: neu.id, fehler: null }
  } catch (e) {
    if (e instanceof NutzerFehler) return { id: null, fehler: e.message }
    throw e
  }
}

// entwurfSenden (der eigentliche Mail-Versand) steht wegen des Datei-Längenlimits in
// app/actions/entwurf-senden.ts.
