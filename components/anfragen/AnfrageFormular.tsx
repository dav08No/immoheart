"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { anfrageAnlegen } from "@/app/actions/anfragen"
import type { Nutzung } from "@/types"

const NUTZUNGEN: Nutzung[] = ["buero", "gewerbe", "produktion", "lager", "verkauf", "bauland"]

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

  // anfrageAnlegen (Task 48) wirft bewusst statt Fehler stillschweigend zu
  // verschlucken (Milestone-Konvention, siehe MailEinfuegen/EntwurfDetail/
  // AnfrageDetail). Ohne try/catch würde ein Fehler (z.B. RLS- oder Netzwerkfehler)
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

  return (
    <div className="flex flex-col gap-2.5 text-sm">
      <input
        placeholder="Ort"
        value={ort}
        onChange={(e) => setOrt(e.target.value)}
        disabled={speichert}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
      />
      <select
        value={nutzung}
        onChange={(e) => setNutzung(e.target.value as Nutzung)}
        disabled={speichert}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
      >
        {NUTZUNGEN.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input
          placeholder="Fläche ab"
          value={flaecheMin}
          onChange={(e) => setFlaecheMin(e.target.value)}
          disabled={speichert}
          className="w-1/2 rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
        />
        <input
          placeholder="Fläche bis"
          value={flaecheMax}
          onChange={(e) => setFlaecheMax(e.target.value)}
          disabled={speichert}
          className="w-1/2 rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
        />
      </div>
      <input
        placeholder="Budget CHF/m² (optional)"
        value={budget}
        onChange={(e) => setBudget(e.target.value)}
        disabled={speichert}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
      />
      <input
        placeholder="Bezug (optional)"
        value={bezug}
        onChange={(e) => setBezug(e.target.value)}
        disabled={speichert}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
      />
      {fehler && <div className="text-sm text-crit">{fehler}</div>}
      <Button variante="primaer" onClick={absenden} disabled={speichert}>
        {speichert ? "Wird gespeichert…" : "Anfrage anlegen"}
      </Button>
    </div>
  )
}
