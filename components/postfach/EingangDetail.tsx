"use client"

import { useState } from "react"
import { Feld } from "@/components/ui/Feld"
import { Button } from "@/components/ui/Button"
import type { NachrichtRow } from "@/lib/queries/nachrichten"
import type { ErkannteFelder } from "@/lib/ki/erkennung"
import type { Nutzung } from "@/types"

const LABELS: Record<keyof ErkannteFelder, string> = {
  firma: "Firma",
  flaeche_min: "Fläche ab",
  flaeche_max: "Fläche bis",
  ort: "Ort",
  budget_pro_m2: "Budget",
  bezug: "Bezug",
  branche: "Branche",
  nutzung: "Nutzung",
}

const NUTZUNG_OPTIONEN: { wert: Nutzung; label: string }[] = [
  { wert: "buero", label: "Büro" },
  { wert: "gewerbe", label: "Gewerbe" },
  { wert: "produktion", label: "Produktion" },
  { wert: "lager", label: "Lager" },
  { wert: "verkauf", label: "Verkauf" },
  { wert: "bauland", label: "Bauland" },
]

type Props = {
  nachricht: NachrichtRow
  // Optionales zweites Argument: von der Nutzerin manuell nachgetragene
  // Nutzung, falls die KI-Erkennung `nutzung` nicht bestimmen konnte. Siehe
  // Kommentar unten bei `nutzungFehlt` -- alsAnfrageSpeichern (Task 39) wirft
  // ohne diesen Wert, statt lautlos zu raten.
  onSpeichern: (nutzungUeberschreibung?: Nutzung) => void
  onRueckfrageOeffnen: () => void
}

export function EingangDetail({ nachricht, onSpeichern, onRueckfrageOeffnen }: Props) {
  const felder = nachricht.erkannte_felder as ErkannteFelder | null
  const luecken = felder ? Object.values(felder).filter((wert) => wert === null).length : 0

  // alsAnfrageSpeichern (Task 39) wirft bewusst, wenn erkannte_felder.nutzung
  // null ist, statt still auf "gewerbe" zu raten -- ein falscher Default
  // würde die Anfrage wegen berechneMatchs (M2) hartem
  // Nutzung-Ausschlusskriterium dauerhaft und lautlos unmatchbar machen. Ist
  // nutzung nicht erkannt, muss die Nutzerin hier vor dem Speichern eine
  // Nutzung auswählen; der gewählte Wert wird als zweites Argument an
  // onSpeichern durchgereicht (siehe Props-Kommentar), NICHT in
  // erkannte_felder zurückgeschrieben -- so bleibt sichtbar, was die KI
  // tatsächlich erkannt hat ("?" bleibt stehen), und was die Nutzerin manuell
  // ergänzt hat.
  const nutzungFehlt = felder !== null && felder.nutzung === null
  const [nutzungAuswahl, setNutzungAuswahl] = useState<Nutzung | "">("")

  // Der Button darf nicht klickbar sein, wenn der Aufruf garantiert wirft:
  // entweder gibt es gar keine erkannten Felder, oder nutzung fehlt und wurde
  // noch nicht manuell nachgetragen.
  const speichernMoeglich = felder !== null && (!nutzungFehlt || nutzungAuswahl !== "")

  return (
    <div>
      <div className="border-b border-line p-4">
        <div className="font-display text-base font-bold text-ink">{nachricht.betreff}</div>
        <div className="mt-0.5 text-xs text-ink-3">
          Von{" "}
          <a href={`mailto:${nachricht.von}`} className="text-brand hover:underline">
            {nachricht.von}
          </a>
        </div>
      </div>
      <div className="p-4">
        <div className="whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
          {nachricht.body}
        </div>
        {felder && (
          <>
            <div className="mb-2.5 mt-4 border-b border-line pb-1.5 text-xs text-ink-3">
              PULS hat erkannt{luecken > 0 ? ` · ${luecken} fehlt` : ""}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(LABELS) as (keyof ErkannteFelder)[]).map((schluessel) => (
                <Feld
                  key={schluessel}
                  label={LABELS[schluessel]}
                  wert={felder[schluessel] === null ? null : String(felder[schluessel])}
                />
              ))}
            </div>
            {nutzungFehlt && (
              <div className="mt-2.5">
                <label htmlFor="eingang-nutzung-auswahl" className="mb-1 block text-xs text-ink-3">
                  Nutzung nicht erkannt · bitte auswählen, um speichern zu können
                </label>
                <select
                  id="eingang-nutzung-auswahl"
                  value={nutzungAuswahl}
                  onChange={(e) => setNutzungAuswahl(e.target.value as Nutzung)}
                  className="w-full rounded-lg border border-warn bg-warn-bg px-3 py-2 text-sm text-ink"
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
          </>
        )}
        <div className="mt-3.5 flex flex-wrap gap-2">
          <Button
            variante="primaer"
            disabled={!speichernMoeglich}
            onClick={() => onSpeichern(nutzungFehlt ? (nutzungAuswahl as Nutzung) : undefined)}
          >
            Als Anfrage speichern
          </Button>
          {luecken > 0 && <Button onClick={onRueckfrageOeffnen}>Rückfrage öffnen</Button>}
        </div>
      </div>
    </div>
  )
}
