import type { ChangeEvent } from "react"
import { Input } from "@/components/shadcn/input"
import { Label } from "@/components/shadcn/label"

type Props = {
  id: string
  label: string
  wert: string
  fehler?: string
  onWechsel: (wert: string) => void
  typ?: "text" | "email" | "tel"
  mehrzeilig?: boolean
  pflicht?: boolean
  autoComplete?: string
  maxLength: number
  // "numeric" für Zahlenfelder: Ziffern-Tastatur am Handy, aber ein Textfeld, damit
  // die Eingabe unverändert beim Server ankommt und dort die Meldung erzeugt.
  inputMode?: "numeric"
  hinweis?: string
}

// Ein Feld mit Fehler direkt darunter: aria-invalid + aria-describedby, damit
// Screenreader die Meldung beim Feld vorlesen.
export function AnfrageFeld({ id, label, wert, fehler, onWechsel, typ = "text", mehrzeilig, pflicht = true, autoComplete, maxLength, inputMode, hinweis }: Props) {
  const fehlerId = `${id}-fehler`
  const hinweisId = `${id}-hinweis`
  const beschreibung = [hinweis && hinweisId, fehler && fehlerId].filter(Boolean).join(" ")
  const gemeinsam = {
    id,
    name: id,
    value: wert,
    required: pflicht,
    maxLength,
    autoComplete,
    inputMode,
    "aria-invalid": fehler ? true : undefined,
    "aria-describedby": beschreibung || undefined,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onWechsel(e.target.value),
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-ink">
        {label}
        {!pflicht && <span className="font-normal text-ink-3">(optional)</span>}
      </Label>
      {mehrzeilig ? (
        <textarea
          {...gemeinsam}
          rows={5}
          className="resize-y rounded-md border border-line-2 bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
        />
      ) : (
        <Input {...gemeinsam} type={typ} className="bg-surface" />
      )}
      {hinweis && <p id={hinweisId} className="text-xs text-ink-3">{hinweis}</p>}
      {fehler && (
        <p id={fehlerId} className="text-sm text-crit">{fehler}</p>
      )}
    </div>
  )
}
