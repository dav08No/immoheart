"use client"

import { useId, useState } from "react"
import { Button } from "@/components/ui/Button"
import { FormFeld, EINGABE_KLASSE } from "@/components/ui/FormFeld"
import { DrawerLeiste } from "@/components/layout/DrawerLeiste"
import { anfrageAnlegen } from "@/app/actions/anfragen"
import { NUTZUNGEN } from "@/lib/nutzung"
import type { Nutzung } from "@/types"

const LEER = { ort: "", nutzung: "gewerbe" as Nutzung, flaecheMin: "", flaecheMax: "", budget: "", bezug: "" }

// Bewusst keine Pflichtfeld-Validierung ausser dem bereits vorbelegten `nutzung`:
// In der anfragen-Basistabelle (20260922195257_schema.sql) sind ort/flaeche_min/
// flaeche_max/budget_pro_m2/bezug allesamt nullable -- eine komplett leere Anfrage
// ist also kein Schemaverstoss. lib/matching.ts behandelt jedes dieser Felder als
// null bereits explizit (z.B. punkteFlaeche/punkteLage/punkteBezug liefern dann
// neutral 50 Punkte statt zu werfen), berechneUndSpeichereMatchesFuerAnfrage würde
// also lediglich durchschnittliche statt aussagekräftige Scores erzeugen, nicht
// fehlschlagen. Das passt zur "?"-Lücken-Philosophie aus AnfragenTabelle: eine
// Anfrage darf mit lauter Lücken angelegt und später ausgefüllt werden.
export function AnfrageFormular({ onFertig }: { onFertig: () => void }) {
  const [ort, setOrt] = useState(LEER.ort)
  const [nutzung, setNutzung] = useState<Nutzung>(LEER.nutzung)
  const [flaecheMin, setFlaecheMin] = useState(LEER.flaecheMin)
  const [flaecheMax, setFlaecheMax] = useState(LEER.flaecheMax)
  const [budget, setBudget] = useState(LEER.budget)
  const [bezug, setBezug] = useState(LEER.bezug)
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  // Sichtbare Labels statt reiner Platzhalter; useId hält die Label-ids eindeutig.
  const idBasis = useId()

  // anfrageAnlegen (Task 48) wirft bewusst statt Fehler stillschweigend zu
  // verschlucken (Milestone-Konvention, siehe MailEinfuegen/AnfrageDetail).
  // Ohne try/catch würde ein Fehler (z.B. RLS- oder Netzwerkfehler)
  // hier zu einer unhandled promise rejection führen und `speichert` bliebe
  // dauerhaft true -- der Button wäre für immer deaktiviert, ohne dass die
  // Nutzerin es erneut versuchen könnte.
  async function absenden() {
    setSpeichert(true)
    setFehler(null)
    try {
      await anfrageAnlegen({
        ort: ort || null,
        nutzung,
        flaeche_min: flaecheMin ? Number(flaecheMin) : null,
        flaeche_max: flaecheMax ? Number(flaecheMax) : null,
        budget_pro_m2: budget ? Number(budget) : null,
        bezug: bezug || null,
      })
      // Formular für die nächste Neuanlage zurücksetzen: Der Drawer aus Task 52
      // bleibt beim Schliessen gemountet (`<AnfrageFormular>` steht dort nicht
      // hinter `{neuOffen && ...}`) -- ohne Reset stünden beim nächsten Öffnen
      // noch die zuletzt eingegebenen Werte da.
      setOrt(LEER.ort)
      setNutzung(LEER.nutzung)
      setFlaecheMin(LEER.flaecheMin)
      setFlaecheMax(LEER.flaecheMax)
      setBudget(LEER.budget)
      setBezug(LEER.bezug)
      onFertig()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setSpeichert(false)
    }
  }

  const feld = (name: string) => `${idBasis}-${name}`

  return (
    <div className="flex flex-1 flex-col gap-4">
      <FormFeld label="Ort" htmlFor={feld("ort")}>
        <input id={feld("ort")} value={ort} onChange={(e) => setOrt(e.target.value)} disabled={speichert} className={EINGABE_KLASSE} />
      </FormFeld>
      <FormFeld label="Nutzung" htmlFor={feld("nutzung")}>
        <select
          id={feld("nutzung")}
          value={nutzung}
          onChange={(e) => setNutzung(e.target.value as Nutzung)}
          disabled={speichert}
          className={EINGABE_KLASSE}
        >
          {NUTZUNGEN.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </FormFeld>
      <div className="grid grid-cols-2 gap-3">
        <FormFeld label="Fläche ab" htmlFor={feld("flaeche-min")}>
          <input
            id={feld("flaeche-min")}
            value={flaecheMin}
            onChange={(e) => setFlaecheMin(e.target.value)}
            disabled={speichert}
            className={EINGABE_KLASSE}
          />
        </FormFeld>
        <FormFeld label="Fläche bis" htmlFor={feld("flaeche-max")}>
          <input
            id={feld("flaeche-max")}
            value={flaecheMax}
            onChange={(e) => setFlaecheMax(e.target.value)}
            disabled={speichert}
            className={EINGABE_KLASSE}
          />
        </FormFeld>
      </div>
      <FormFeld label="Budget CHF/m² (optional)" htmlFor={feld("budget")}>
        <input id={feld("budget")} value={budget} onChange={(e) => setBudget(e.target.value)} disabled={speichert} className={EINGABE_KLASSE} />
      </FormFeld>
      <FormFeld label="Bezug (optional)" htmlFor={feld("bezug")}>
        <input id={feld("bezug")} value={bezug} onChange={(e) => setBezug(e.target.value)} disabled={speichert} className={EINGABE_KLASSE} />
      </FormFeld>
      <DrawerLeiste>
        {/* Fehler in der Leiste, damit er neben dem Knopf sichtbar ist, egal wohin gescrollt wurde. */}
        {fehler && (
          <p role="alert" className="mr-auto min-w-0 basis-full text-sm text-crit wrap-break-word">
            {fehler}
          </p>
        )}
        <Button variante="primaer" onClick={absenden} disabled={speichert}>
          {speichert ? "Wird gespeichert…" : "Anfrage anlegen"}
        </Button>
      </DrawerLeiste>
    </div>
  )
}
