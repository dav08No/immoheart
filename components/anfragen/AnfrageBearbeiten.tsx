"use client"

import { useId } from "react"
import { Abschnittstitel } from "@/components/ui/Abschnittstitel"
import { FormFeld, EINGABE_KLASSE } from "@/components/ui/FormFeld"
import type { AnfrageMitFirma } from "@/lib/queries/anfragen"

export type Eingaben = { flaecheMin: string; flaecheMax: string; ort: string; budget: string; bezug: string }

// Startwerte (und Werte nach "Abbrechen") aus der gespeicherten Anfrage.
export function eingabenAus(anfrage: AnfrageMitFirma): Eingaben {
  return {
    flaecheMin: anfrage.flaeche_min?.toString() ?? "",
    flaecheMax: anfrage.flaeche_max?.toString() ?? "",
    ort: anfrage.ort ?? "",
    budget: anfrage.budget_pro_m2?.toString() ?? "",
    bezug: anfrage.bezug ?? "",
  }
}

const FELDER: { schluessel: keyof Eingaben; label: string; platzhalter?: string }[] = [
  { schluessel: "flaecheMin", label: "Fläche ab" },
  { schluessel: "flaecheMax", label: "Fläche bis" },
  { schluessel: "ort", label: "Ort", platzhalter: "fehlt" },
  { schluessel: "budget", label: "Budget", platzhalter: "fehlt" },
  { schluessel: "bezug", label: "Bezug", platzhalter: "fehlt" },
]

type Props = {
  eingaben: Eingaben
  onAendern: (schluessel: keyof Eingaben, wert: string) => void
  laufend: boolean
  fehler: string | null
}

export function AnfrageBearbeiten({ eingaben, onAendern, laufend, fehler }: Props) {
  const idBasis = useId()
  return (
    <section className="flex flex-col gap-3">
      <Abschnittstitel>Bearbeiten</Abschnittstitel>
      <div className="grid grid-cols-2 gap-3">
        {FELDER.map(({ schluessel, label, platzhalter }) => {
          const id = `${idBasis}-${schluessel}`
          return (
            <FormFeld key={schluessel} label={label} htmlFor={id}>
              <input
                id={id}
                value={eingaben[schluessel]}
                onChange={(e) => onAendern(schluessel, e.target.value)}
                disabled={laufend}
                placeholder={platzhalter}
                className={EINGABE_KLASSE}
              />
            </FormFeld>
          )
        })}
      </div>
      {fehler && (
        <p role="alert" className="text-sm text-crit wrap-break-word">
          {fehler}
        </p>
      )}
    </section>
  )
}
