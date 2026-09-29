"use client"

import { useState } from "react"
import Link from "next/link"
import { Feld } from "@/components/ui/Feld"
import { Abschnittstitel } from "@/components/ui/Abschnittstitel"
import { Button } from "@/components/ui/Button"
import { alsAnfrageSpeichern } from "@/app/actions/nachrichten"
import type { ErkannteFelder } from "@/lib/ki/erkennung"
import { suchanfrageKontakt } from "@/lib/eingang/anfrage-aus-eingang"
import { suchanfrageKopf } from "@/lib/postfach"
import type { PostfachNachricht } from "@/lib/queries/postfach"
import type { Nutzung } from "@/types"
import { cn } from "@/lib/utils"
import { AUSWAHL_KLASSE, FELD_LABELS, NUTZUNG_OPTIONEN, nutzungLabel, type AktionAusfuehren } from "./typen"

type Props = {
  nachricht: PostfachNachricht
  laufend: string | null
  ausfuehren: AktionAusfuehren
  onRueckfrageOeffnen: () => void
}

function anzeigeWert(schluessel: keyof ErkannteFelder, felder: ErkannteFelder): string | null {
  const wert = felder[schluessel]
  if (wert == null) return null
  return schluessel === "nutzung" ? nutzungLabel(String(wert)) : String(wert)
}

export function AktionenSuchanfrage({ nachricht, laufend, ausfuehren, onRueckfrageOeffnen }: Props) {
  const felder = nachricht.erkannte_felder as ErkannteFelder | null
  // Nur Website-Suchaufträge tragen Kontaktangaben; Mail-Eingänge haben dafür den Absender.
  const kontakt = suchanfrageKontakt(nachricht.erkannte_felder)
  const kopf = felder ? suchanfrageKopf(nachricht.quelle, felder) : null
  // alsAnfrageSpeichern rät bei fehlender Nutzung bewusst nicht (hartes Matching-Kriterium);
  // die hier gewählte Nutzung wird nur mitgegeben, erkannte_felder bleibt die KI-Erkennung.
  const nutzungFehlt = felder !== null && felder.nutzung == null
  const [nutzungAuswahl, setNutzungAuswahl] = useState<Nutzung | "">("")
  const gespeichert = nachricht.anfrage_id !== null
  const speichernMoeglich = felder !== null && (!nutzungFehlt || nutzungAuswahl !== "") && laufend === null

  function speichern() {
    const ueberschreibung = nutzungFehlt && nutzungAuswahl !== "" ? nutzungAuswahl : undefined
    void ausfuehren("speichern", () => alsAnfrageSpeichern(nachricht.id, ueberschreibung), "Anfrage gespeichert.")
  }

  return (
    <section aria-label="Suchanfrage">
      {kontakt && (
        <div className="mb-4">
          <Abschnittstitel className="mb-2.5">Kontakt aus dem Formular</Abschnittstitel>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Feld label="Name" wert={kontakt.name} />
            <Feld label="E-Mail" wert={kontakt.email} />
            <Feld label="Telefon" wert={kontakt.telefon} optional />
          </div>
          {/* Nur Text, nie HTML: die Besucherin hat das frei eingetippt. */}
          {kontakt.nachricht && (
            <p className="mt-2 whitespace-pre-wrap wrap-break-word rounded-lg border border-line p-3 text-sm text-ink-2">{kontakt.nachricht}</p>
          )}
        </div>
      )}
      {felder && kopf && (
        <>
          <Abschnittstitel className="mb-2.5">{kopf.ueberschrift}</Abschnittstitel>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(FELD_LABELS) as (keyof ErkannteFelder)[]).map((schluessel) => (
              <Feld key={schluessel} label={FELD_LABELS[schluessel]} wert={anzeigeWert(schluessel, felder)} />
            ))}
          </div>
        </>
      )}
      {nutzungFehlt && !gespeichert && (
        <div className="mt-2.5">
          <label htmlFor={`nutzung-${nachricht.id}`} className="mb-1 block text-xs text-ink-2">
            Nutzung nicht erkannt · bitte auswählen, um speichern zu können
          </label>
          <select
            id={`nutzung-${nachricht.id}`}
            value={nutzungAuswahl}
            onChange={(e) => setNutzungAuswahl(e.target.value as Nutzung)}
            className={cn(AUSWAHL_KLASSE, "border-warn bg-warn-bg")}
          >
            <option value="" disabled>
              Nutzung wählen …
            </option>
            {NUTZUNG_OPTIONEN.map((option) => (
              <option key={option.wert} value={option.wert}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        {gespeichert ? (
          <Link
            href={`/admin/anfragen?id=${nachricht.anfrage_id}`}
            className="text-sm text-good hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            Als Anfrage gespeichert · öffnen
          </Link>
        ) : (
          <Button variante="primaer" disabled={!speichernMoeglich} onClick={speichern}>
            {laufend === "speichern" ? "Wird gespeichert…" : "Als Anfrage speichern"}
          </Button>
        )}
        {kopf?.rueckfrage && <Button onClick={onRueckfrageOeffnen}>Rückfrage öffnen</Button>}
      </div>
    </section>
  )
}
