import type { ReactNode } from "react"

// Gemeinsame Klassen für input/select/textarea. min-h statt h, damit textarea wachsen darf.
// Rahmen --eingabe-rand (>= 3:1), damit Felder als Felder erkennbar sind.
export const EINGABE_KLASSE =
  "min-h-10 w-full min-w-0 rounded-lg border border-eingabe-rand bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none transition-colors focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/40 aria-invalid:border-crit aria-invalid:ring-crit/30 disabled:cursor-not-allowed disabled:opacity-60"

type Props = { label: string; htmlFor: string; hinweis?: string; fehler?: string; children: ReactNode }

// Hinweis/Fehler tragen feste IDs (`<htmlFor>-hinweis`, `<htmlFor>-fehler`), damit das
// Eingabefeld sie per aria-describedby verknüpfen kann, ohne dass FormFeld Kinder klont.
export function FormFeld({ label, htmlFor, hinweis, fehler, children }: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hinweis && !fehler && (
        <p id={`${htmlFor}-hinweis`} className="text-xs text-ink-2">
          {hinweis}
        </p>
      )}
      {fehler && (
        <p id={`${htmlFor}-fehler`} className="text-xs font-medium text-crit">
          {fehler}
        </p>
      )}
    </div>
  )
}
