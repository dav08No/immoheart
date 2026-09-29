import type { ReactNode } from "react"

// Basis-Stile über Nachkommen-Selektoren, damit Aufrufer normales <thead>/<tr>/<td>
// schreiben. Handy: die Hülle scrollt waagrecht, die erste Spalte bleibt stehen.
const TABELLE = [
  "w-full border-collapse text-sm text-ink",
  "[&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-ink-2",
  "[&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle",
  "[&_tbody_tr]:border-t [&_tbody_tr]:border-line [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-surface-2",
  "max-sm:[&_tr>*:first-child]:sticky max-sm:[&_tr>*:first-child]:left-0 max-sm:[&_tr>*:first-child]:bg-surface",
].join(" ")

// minBreite: breite Tabellen behalten ihre Spaltenbreiten und scrollen, statt zu quetschen.
export function Tabelle({
  children,
  ariaLabel,
  minBreite,
}: {
  children: ReactNode
  ariaLabel: string
  minBreite?: string
}) {
  return (
    // tabIndex: eine scrollbare Fläche muss per Tastatur erreichbar sein.
    <div
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      className="overflow-x-auto rounded-panel focus-visible:outline-2 focus-visible:outline-ring"
    >
      <table className={minBreite ? `${TABELLE} ${minBreite}` : TABELLE}>{children}</table>
    </div>
  )
}
