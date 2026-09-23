"use server"

import { revalidatePath } from "next/cache"
import { erkenneFelder, type ErkannteFelder } from "@/lib/ki/erkennung"
import { entwurfRueckfrage } from "@/lib/ki/entwuerfe"
import type { Nutzung } from "@/types"
import {
  holeNachricht,
  legeNachrichtAn,
  aktualisiereNachricht,
  loescheNachricht,
  type NachrichtRow,
} from "@/lib/queries/nachrichten"
import { legeAnfrageAn } from "@/lib/queries/anfragen"
import { legeRegelAn, naechsterRegelCode } from "@/lib/queries/regeln"
import { holeEigenesProfil } from "@/lib/queries/profile"

// Rückfragen und Nachfass gelten laut README-Freigabestufen wie Rückfragen:
// automatischer Versand ab Stufe 2. Nur Angebote brauchen Stufe 3 (Spec-Annahme A2).
export async function sendeWennFreigegeben(nachricht: NachrichtRow, erforderlicheStufe: 2 | 3): Promise<void> {
  const profil = await holeEigenesProfil()
  if (profil.freigabe_stufe >= erforderlicheStufe) {
    await aktualisiereNachricht(nachricht.id, { richtung: "gesendet", gesendet_am: new Date().toISOString() })
  }
}

export async function nachrichtEingegangen(text: string, von: string, betreff: string): Promise<void> {
  // Rohtext IMMER zuerst und unbedingt persistieren, bevor die KI angefragt wird.
  // erkenneFelder (Task 37) und entwurfRueckfrage/parseMailAntwort (Task 38) sind
  // bewusst so gebaut, dass sie bei einer fehlerhaften oder unerwarteten KI-Antwort
  // werfen (Netzwerkfehler, kaputtes JSON, "Unerwartete Antwort der KI") statt still
  // leere Werte zu liefern. Würde die eingehende Nachricht erst NACH diesem Aufruf
  // gespeichert, ginge eine echte Geschäftsanfrage bei jedem KI-Fehler spurlos
  // verloren -- kein Datensatz, nur ein geworfener Fehler, keine Möglichkeit für den
  // Menschen, den Text erneut zu verarbeiten. Erkennung und Rückfrage-Entwurf laufen
  // deshalb als separater, fehlbarer zweiter Schritt NACH dem gesicherten Speichern
  // des Rohtexts. Schlägt dieser zweite Schritt fehl, bleibt die Nachricht im
  // Postfach sichtbar (ohne erkannte Felder); "Als Anfrage speichern" wirft dann
  // ohnehin schon den vorhandenen Guard weiter unten in alsAnfrageSpeichern.
  const nachricht = await legeNachrichtAn({
    richtung: "eingang",
    typ: "anfrage",
    von,
    an: "kontakt@espaceso.ch",
    betreff,
    body: text,
    erkannte_felder: null,
  })
  revalidatePath("/postfach")

  const felder = await erkenneFelder(text)
  await aktualisiereNachricht(nachricht.id, { erkannte_felder: felder })

  const luecken = Object.values(felder).some((wert) => wert === null)
  if (luecken) {
    const entwurf = await entwurfRueckfrage(felder)
    const rueckfrageNachricht = await legeNachrichtAn({
      richtung: "entwurf",
      typ: "rueckfrage",
      von: "kontakt@espaceso.ch",
      an: von,
      betreff: entwurf.betreff,
      body: entwurf.body,
    })
    await sendeWennFreigegeben(rueckfrageNachricht, 2)
  }

  revalidatePath("/postfach")
}

export async function alsAnfrageSpeichern(nachrichtId: string, nutzungUeberschreibung?: Nutzung): Promise<void> {
  const nachricht = await holeNachricht(nachrichtId)
  if (!nachricht) throw new Error("Nachricht nicht gefunden")

  const felder = nachricht.erkannte_felder as ErkannteFelder | null
  if (!felder) throw new Error("Diese Nachricht hat keine erkannten Felder")

  // KEIN stiller Rateschritt bei fehlender nutzung: anfragen.nutzung ist zwar nicht
  // nullbar, aber berechneMatch (M2) schliesst mit einem harten Gate
  // (anfrage.nutzung !== objekt.nutzung -> null) JEDE Anfrage mit falscher nutzung
  // dauerhaft und ohne Fehlermeldung vom Matching aus. Task 37 hat nutzung genau
  // deshalb als achtes KI-Feld ergänzt, um diesen stillen Rateschritt in der Server
  // Action zu vermeiden ("... ohne KI-Schätzung sonst ein stiller Rateschritt in der
  // Server Action nötig wäre"). Ein Default wie "gewerbe" würde genau das wieder
  // einführen und eine echte Anfrage unauffindbar machen.
  //
  // Task 42 hat EingangDetail um ein Pflicht-Auswahlfeld für nutzung ergänzt,
  // sichtbar/Pflicht genau dann, wenn felder.nutzung null ist. Der dort von der
  // Nutzerin gewählte Wert kommt hier als nutzungUeberschreibung an und wird NUR
  // verwendet, wenn die KI selbst nichts erkannt hat -- felder.nutzung hat immer
  // Vorrang. Die Überschreibung wird bewusst NICHT in erkannte_felder
  // zurückgeschrieben: erkannte_felder bleibt die ungefilterte Aufzeichnung dessen,
  // was die KI tatsächlich erkannt hat (die Oberfläche zeigt fehlende Werte weiterhin
  // korrekt als "?"), während die menschliche Korrektur nur in die neu angelegte
  // Anfrage einfliesst.
  const nutzung = felder.nutzung ?? nutzungUeberschreibung
  if (!nutzung) {
    throw new Error(
      "Nutzung konnte nicht erkannt werden. Bitte Nutzung manuell bestimmen, bevor die Anfrage gespeichert wird."
    )
  }

  await legeAnfrageAn({
    ort: felder.ort,
    nutzung,
    flaeche_min: felder.flaeche_min,
    flaeche_max: felder.flaeche_max,
    budget_pro_m2: felder.budget_pro_m2,
    bezug: felder.bezug,
  })

  await loescheNachricht(nachrichtId)
  revalidatePath("/postfach")
  revalidatePath("/anfragen")
}

export async function entwurfSenden(nachrichtId: string): Promise<void> {
  await aktualisiereNachricht(nachrichtId, { richtung: "gesendet", gesendet_am: new Date().toISOString() })
  revalidatePath("/postfach")
}

export async function entwurfBearbeiten(nachrichtId: string, body: string): Promise<void> {
  await aktualisiereNachricht(nachrichtId, { body })
  revalidatePath("/postfach")
}

export async function entwurfVerwerfen(nachrichtId: string, grund: string): Promise<void> {
  const code = await naechsterRegelCode()
  await legeRegelAn(code, grund)
  await loescheNachricht(nachrichtId)
  revalidatePath("/postfach")
  revalidatePath("/regeln")
}
