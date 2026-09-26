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
  loescheUndGibNachrichtZurueck,
  type NachrichtRow,
} from "@/lib/queries/nachrichten"
import { legeAnfrageAn } from "@/lib/queries/anfragen"
import { berechneUndSpeichereMatchesFuerAnfrage } from "@/lib/queries/matches"
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
  revalidatePath("/admin/postfach")

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

  revalidatePath("/admin/postfach")
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

  // Fix-Loop Runde 2 (Task 44): holeNachricht oben + legeAnfrageAn + loescheNachricht
  // GETRENNT bedeutete, dass zwei überlappende Aufrufe für dieselbe nachrichtId
  // (z.B. ein Doppelklick, der die clientseitige speichernLaufend-Sperre in
  // PostfachAnsicht umgeht, weil zwischen den beiden Klicks kurz weg- und wieder
  // hinnavigiert wurde) beide dieselbe, noch nicht gelöschte Zeile lesen und beide
  // legeAnfrageAn aufrufen konnten -- zwei doppelte Anfragen aus einer
  // Quelle-Nachricht. Der Lösch-Schritt ist deshalb JETZT ein atomarer
  // Lösch-und-Rückgabe-Aufruf (loescheUndGibNachrichtZurueck): Postgres
  // serialisiert konkurrierende DELETEs auf dieselbe Zeile, nur EINER der beiden
  // Aufrufe bekommt die Zeile zurück, der andere erhält `null` und wirft --
  // statt einer zweiten, doppelten Anfrage.
  //
  // WICHTIG: dieser Aufruf steht bewusst HIER, unmittelbar vor legeAnfrageAn, NICHT
  // am Anfang der Funktion anstelle von holeNachricht oben. Der nutzung-Check
  // darüber muss zwingend VOR jedem Löschen passieren -- der ganze Sinn des Throws
  // bei fehlender nutzung ist es, dass die Nutzerin über die EingangDetail-UI
  // (Task 42) zurückkehren und die Nutzung manuell nachtragen kann, was voraussetzt,
  // dass die Quelle-Nachricht dafür noch existiert. Würde zuerst gelöscht und erst
  // danach auf nutzung geprüft, würde ausgerechnet ein fehlschlagender
  // Speichern-Versuch (mangels nutzung) die einzige Möglichkeit zerstören, ihn zu
  // korrigieren. Das lässt ein sehr kurzes Fenster zwischen dem nutzung-Check oben
  // und diesem Aufruf offen (zwei schnelle, aufeinanderfolgende DB-Zugriffe ohne
  // Nutzerinteraktion dazwischen) -- deutlich enger als das ursprüngliche Fenster
  // über den gesamten Funktionsverlauf, und der atomare Lösch-und-Rückgabe-Aufruf
  // selbst garantiert weiterhin, dass nur EIN Aufruf jemals legeAnfrageAn erreichen
  // kann.
  const geloescht = await loescheUndGibNachrichtZurueck(nachrichtId)
  if (!geloescht) {
    throw new Error("Nachricht wurde bereits verarbeitet oder existiert nicht mehr")
  }

  const neue = await legeAnfrageAn({
    ort: felder.ort,
    nutzung,
    flaeche_min: felder.flaeche_min,
    flaeche_max: felder.flaeche_max,
    budget_pro_m2: felder.budget_pro_m2,
    bezug: felder.bezug,
  })

  // Fix-Loop Task 48: AnfrageDetail (Task 50) berechnet Matches nicht selbst
  // bei jedem Aufruf, sondern liest ausschliesslich vorab gespeicherte Zeilen
  // über holeBesterMatchFuerAnfrage. War die KI-Erkennung bereits vollständig
  // (keine "?"-Lücken, die eine Vermittlerin erst im Formular schliessen und
  // damit über anfrageAktualisieren ein Rematching auslösen müsste), gäbe es
  // ohne diesen Aufruf hier nie einen Auslöser für den ersten Match-Durchlauf
  // -- der Bereich "Bester Treffer" bliebe für eine aus einer Mail angelegte
  // Anfrage dauerhaft leer.
  await berechneUndSpeichereMatchesFuerAnfrage(neue.id)

  revalidatePath("/admin/postfach")
  revalidatePath("/admin/anfragen")
}

export async function entwurfSenden(nachrichtId: string): Promise<void> {
  await aktualisiereNachricht(nachrichtId, { richtung: "gesendet", gesendet_am: new Date().toISOString() })
  revalidatePath("/admin/postfach")
}

export async function entwurfBearbeiten(nachrichtId: string, body: string): Promise<void> {
  await aktualisiereNachricht(nachrichtId, { body })
  revalidatePath("/admin/postfach")
}

export async function entwurfVerwerfen(nachrichtId: string, grund: string): Promise<void> {
  const code = await naechsterRegelCode()
  await legeRegelAn(code, grund)
  await loescheNachricht(nachrichtId)
  revalidatePath("/admin/postfach")
}
