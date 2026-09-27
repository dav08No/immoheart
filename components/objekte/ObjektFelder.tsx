"use client"

import { useId } from "react"
import { Switch } from "@/components/shadcn/switch"
import { MAX_BESCHREIBUNG } from "@/lib/objekt-fotos"

// Ein <input> je einfachem Textfeld statt Copy-Paste (Titel/Adresse/Ort/Eigentümer
// sehen bis auf Platzhalter und Breite identisch aus).
export function TextFeld({
  placeholder, wert, setWert, disabled, halb,
}: {
  placeholder: string; wert: string; setWert: (v: string) => void; disabled: boolean; halb?: boolean
}) {
  return (
    <input
      placeholder={placeholder}
      aria-label={placeholder}
      value={wert}
      onChange={(e) => setWert(e.target.value)}
      disabled={disabled}
      className={`${halb ? "w-1/2" : ""} rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60`}
    />
  )
}

export function SelectFeld<T extends string>({
  wert, setWert, optionen, disabled,
}: { wert: T; setWert: (v: T) => void; optionen: { wert: T; label: string }[]; disabled: boolean }) {
  return (
    <select
      value={wert}
      onChange={(e) => setWert(e.target.value as T)}
      disabled={disabled}
      className="rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
    >
      {optionen.map((o) => (
        <option key={o.wert} value={o.wert}>{o.label}</option>
      ))}
    </select>
  )
}

export function BeschreibungFeld({
  wert, setWert, disabled,
}: { wert: string; setWert: (v: string) => void; disabled: boolean }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-ink-2">Beschreibung</label>
      <textarea
        id={id}
        value={wert}
        onChange={(e) => setWert(e.target.value)}
        maxLength={MAX_BESCHREIBUNG}
        rows={5}
        disabled={disabled}
        placeholder="Wird auf der Website angezeigt (ohne Adresse und Eigentümer)."
        className="resize-y rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
      />
      <span className="self-end text-[11px] text-ink-3">{wert.length}/{MAX_BESCHREIBUNG}</span>
    </div>
  )
}

export function SichtbarkeitFeld({
  wert, setWert, disabled,
}: { wert: boolean; setWert: (v: boolean) => void; disabled: boolean }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-2.5 py-2">
      <label htmlFor={id} className="text-sm text-ink">
        Auf Website sichtbar
        <span className="block text-xs text-ink-3">Nur verfügbare und reservierte Objekte erscheinen öffentlich.</span>
      </label>
      <Switch id={id} checked={wert} onCheckedChange={setWert} disabled={disabled} />
    </div>
  )
}
