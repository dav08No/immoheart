// Zentrale Umsetzung der wichtigsten Textregel des Projekts: ein fehlender Wert erscheint als "?", nicht als Erklärsatz.
//
// Ein rein aus Leerzeichen bestehender Wert zählt wie null/"" als "fehlt" --
// analog zu punkteLage/punkteBezug in lib/matching.ts, wo dieselbe
// Whitespace-Normalisierung nötig war, damit ein leeres Pflichtfeld in einem
// künftigen Formular nicht wie ein echter Wert behandelt wird.
type Props = { label: string; wert: string | null }

export function Feld({ label, wert }: Props) {
  const fehlt = wert === null || wert.trim() === ""
  return (
    <div className={`rounded-lg border px-3 py-2 ${fehlt ? "border-warn bg-warn-bg" : "border-line"}`}>
      <div className="text-xs text-ink-3">{label}</div>
      <div className={`mt-0.5 text-sm font-medium ${fehlt ? "font-display text-lg text-warn" : "text-ink"}`}>
        {fehlt ? "?" : wert}
      </div>
    </div>
  )
}
