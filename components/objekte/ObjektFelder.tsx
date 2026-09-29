"use client"

import { useId } from "react"
import { Switch } from "@/components/shadcn/switch"
import { FormFeld, EINGABE_KLASSE } from "@/components/ui/FormFeld"
import { MAX_BESCHREIBUNG } from "@/lib/objekt-fotos"

// Ein Feld je einfachem Text statt Copy-Paste (Titel/Adresse/Ort/Eigentümer sehen bis
// auf das Label identisch aus). Label sichtbar oben statt nur als Platzhalter.
export function TextFeld({
  label, wert, setWert, disabled, typ = "text",
}: {
  label: string; wert: string; setWert: (v: string) => void; disabled: boolean; typ?: "text" | "date"
}) {
  const id = useId()
  return (
    <FormFeld label={label} htmlFor={id}>
      <input id={id} type={typ} value={wert} onChange={(e) => setWert(e.target.value)} disabled={disabled} className={EINGABE_KLASSE} />
    </FormFeld>
  )
}

export function SelectFeld<T extends string>({
  label, wert, setWert, optionen, disabled,
}: { label: string; wert: T; setWert: (v: T) => void; optionen: { wert: T; label: string }[]; disabled: boolean }) {
  const id = useId()
  return (
    <FormFeld label={label} htmlFor={id}>
      <select id={id} value={wert} onChange={(e) => setWert(e.target.value as T)} disabled={disabled} className={EINGABE_KLASSE}>
        {optionen.map((o) => (
          <option key={o.wert} value={o.wert}>{o.label}</option>
        ))}
      </select>
    </FormFeld>
  )
}

export function BeschreibungFeld({
  wert, setWert, disabled,
}: { wert: string; setWert: (v: string) => void; disabled: boolean }) {
  const id = useId()
  return (
    <FormFeld label="Beschreibung" htmlFor={id}>
      <textarea
        id={id}
        value={wert}
        onChange={(e) => setWert(e.target.value)}
        maxLength={MAX_BESCHREIBUNG}
        rows={5}
        disabled={disabled}
        placeholder="Wird auf der Website angezeigt (ohne Adresse und Eigentümer)."
        className={`${EINGABE_KLASSE} resize-y`}
      />
      <span className="self-end text-[11px] text-ink-2">{wert.length}/{MAX_BESCHREIBUNG}</span>
    </FormFeld>
  )
}

export function SichtbarkeitFeld({
  wert, setWert, disabled,
}: { wert: boolean; setWert: (v: boolean) => void; disabled: boolean }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
      <label htmlFor={id} className="min-w-0 text-sm text-ink">
        Auf Website sichtbar
        <span className="block text-xs text-ink-2">Nur verfügbare und reservierte Objekte erscheinen öffentlich.</span>
      </label>
      <Switch id={id} checked={wert} onCheckedChange={setWert} disabled={disabled} />
    </div>
  )
}
