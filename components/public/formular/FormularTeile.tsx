import type { RefObject } from "react"
import { CircleCheck } from "lucide-react"

// Kleine, gemeinsame Anzeigeteile der öffentlichen Formulare.

export function DankeHinweis({ danke }: { danke: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={danke} tabIndex={-1} role="status" className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-6 outline-none">
      <CircleCheck className="size-8 text-good" aria-hidden />
      <h2 className="font-display text-xl font-bold text-ink">Danke!</h2>
      <p className="text-ink-2">Wir melden uns innerhalb von 1–2 Werktagen.</p>
    </div>
  )
}

export function FormularFehler({ text, fehlerRef }: { text: string; fehlerRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={fehlerRef} tabIndex={-1} role="alert" className="rounded-md bg-crit-bg px-3 py-2 text-sm text-crit outline-none">
      {text}
    </div>
  )
}

// Honeypot: für Menschen unsichtbar und nicht erreichbar, Bots füllen es aus.
export function Honeypot({ id, wert, onWechsel }: { id: string; wert: string; onWechsel: (wert: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor={id}>Webseite</label>
      <input id={id} name="webseite" type="text" tabIndex={-1} autoComplete="off"
        value={wert} onChange={(e) => onWechsel(e.target.value)} />
    </div>
  )
}
