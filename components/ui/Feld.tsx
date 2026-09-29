// Zentrale Umsetzung der wichtigsten Textregel des Projekts: ein fehlender Wert erscheint als "?", nicht als Erklärsatz.
//
// Ein rein aus Leerzeichen bestehender Wert zählt wie null/"" als "fehlt" --
// analog zu punkteLage/punkteBezug in lib/matching.ts, wo dieselbe
// Whitespace-Normalisierung nötig war, damit ein leeres Pflichtfeld in einem
// künftigen Formular nicht wie ein echter Wert behandelt wird.
//
// Label und "–" in ink-2: ink-3 erreicht auf surface keine 4.5:1.
//
// optional: ein fehlender Wert ist erwartet (z. B. freiwilliges Telefon) und
// erscheint neutral als "–" statt als Warnung.
type Props = { label: string; wert: string | null; optional?: boolean }

export function Feld({ label, wert, optional = false }: Props) {
  const fehlt = wert === null || wert.trim() === ""
  if (fehlt && optional) {
    return (
      <div className="rounded-lg border border-line px-3 py-2">
        <div className="text-xs text-ink-2">{label}</div>
        <div className="mt-0.5 text-sm font-medium text-ink-2">–</div>
      </div>
    )
  }
  return (
    <div className={`min-w-0 rounded-lg border px-3 py-2 ${fehlt ? "border-warn bg-warn-bg" : "border-line"}`}>
      <div className="text-xs text-ink-2">{label}</div>
      <div className={`mt-0.5 text-sm font-medium wrap-anywhere ${fehlt ? "font-display text-lg text-warn" : "text-ink"}`}>
        {fehlt ? "?" : wert}
      </div>
    </div>
  )
}
