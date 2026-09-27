"use client"

import { useId, useState } from "react"
import type { ObjektFilter } from "@/lib/objektsuche"
import { Checkbox } from "@/components/shadcn/checkbox"
import { Input } from "@/components/shadcn/input"
import { Label } from "@/components/shadcn/label"
import { Slider } from "@/components/shadcn/slider"
import type { SetzeFilter } from "./useFilterUrl"
import { eigenschaftLabel, formatZahl, NUTZUNG_OPTIONEN, type FilterOptionen } from "./anzeige"

type Props = { filter: ObjektFilter; optionen: FilterOptionen; setze: SetzeFilter }

function umschalten<T>(liste: T[], wert: T, an: boolean): T[] {
  return an ? [...liste, wert] : liste.filter((w) => w !== wert)
}

function CheckboxGruppe({ titel, werte, gewaehlt, label, onWechsel }: {
  titel: string
  werte: string[]
  gewaehlt: string[]
  label: (wert: string) => string
  onWechsel: (wert: string, an: boolean) => void
}) {
  const id = useId()
  if (werte.length === 0) return null
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-2.5 text-sm font-semibold text-ink">{titel}</legend>
      {werte.map((wert, i) => (
        <div key={wert} className="flex items-center gap-2">
          <Checkbox
            id={`${id}-${i}`}
            checked={gewaehlt.includes(wert)}
            onCheckedChange={(an) => onWechsel(wert, an === true)}
          />
          <Label htmlFor={`${id}-${i}`} className="font-normal text-ink-2">
            {label(wert)}
          </Label>
        </div>
      ))}
    </fieldset>
  )
}

export function FilterFormular({ filter, optionen, setze }: Props) {
  const id = useId()
  const bereich = optionen.flaeche
  const flaeche: [number, number] = bereich
    ? [filter.flaecheMin ?? bereich.min, filter.flaecheMax ?? bereich.max]
    : [0, 0]

  // Das Preisfeld braucht eigenen Text (leer, halb getippt, zu gross); ein neuer
  // Filterwert von aussen (z.B. zurückgesetzt) wird beim Rendern übernommen.
  const [preis, setPreis] = useState(filter.preisMax === null ? "" : String(filter.preisMax))
  const [preisVorher, setPreisVorher] = useState(filter.preisMax)
  if (preisVorher !== filter.preisMax) {
    setPreisVorher(filter.preisMax)
    setPreis(filter.preisMax === null ? "" : String(filter.preisMax))
  }

  function flaecheGeaendert(wert: number[]) {
    if (!bereich) return
    const [von = bereich.min, bis = bereich.max] = wert
    // Ganzer Bereich = kein Filter, damit die URL sauber bleibt.
    setze({ flaecheMin: von > bereich.min ? von : null, flaecheMax: bis < bereich.max ? bis : null }, true)
  }

  function preisGeaendert(text: string) {
    setPreis(text)
    const zahl = /^\d+$/.test(text) && Number(text) <= 10000 ? Number(text) : null
    // Eigene Eingabe gilt schon als übernommen, sonst würde der Sync sie überschreiben.
    setPreisVorher(zahl)
    setze({ preisMax: zahl }, true)
  }

  return (
    <div className="flex flex-col gap-7">
      <CheckboxGruppe
        titel="Nutzung"
        werte={NUTZUNG_OPTIONEN.map((o) => o.wert)}
        gewaehlt={filter.nutzung}
        label={(w) => NUTZUNG_OPTIONEN.find((o) => o.wert === w)?.label ?? w}
        onWechsel={(w, an) => {
          const option = NUTZUNG_OPTIONEN.find((o) => o.wert === w)
          if (option) setze({ nutzung: umschalten(filter.nutzung, option.wert, an) })
        }}
      />
      <CheckboxGruppe
        titel="Ort"
        werte={optionen.orte}
        gewaehlt={filter.orte}
        label={(w) => w}
        onWechsel={(w, an) => setze({ orte: umschalten(filter.orte, w, an) })}
      />

      {bereich && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <span id={`${id}-flaeche`} className="text-sm font-semibold text-ink">Fläche</span>
            <span className="text-sm text-ink-2 tabular-nums">
              {formatZahl(flaeche[0])} – {formatZahl(flaeche[1])} m²
            </span>
          </div>
          <Slider
            aria-labelledby={`${id}-flaeche`}
            thumbLabels={["Fläche von (m²)", "Fläche bis (m²)"]}
            min={bereich.min}
            max={bereich.max}
            step={1}
            minStepsBetweenThumbs={0}
            value={flaeche}
            onValueChange={flaecheGeaendert}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-preis`} className="font-semibold text-ink">Preis max. (CHF/m² pro Jahr)</Label>
        <Input
          id={`${id}-preis`}
          type="number"
          inputMode="numeric"
          min={0}
          max={10000}
          step={1}
          placeholder="beliebig"
          value={preis}
          onChange={(e) => preisGeaendert(e.target.value)}
          className="bg-surface"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-datum`} className="font-semibold text-ink">Verfügbar bis</Label>
        <Input
          id={`${id}-datum`}
          type="date"
          value={filter.verfuegbarBis ?? ""}
          onChange={(e) => setze({ verfuegbarBis: /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) ? e.target.value : null })}
          className="bg-surface"
        />
      </div>

      <CheckboxGruppe
        titel="Eigenschaften"
        werte={optionen.eigenschaften}
        gewaehlt={filter.eigenschaften}
        label={eigenschaftLabel}
        onWechsel={(w, an) => setze({ eigenschaften: umschalten(filter.eigenschaften, w, an) })}
      />
    </div>
  )
}
