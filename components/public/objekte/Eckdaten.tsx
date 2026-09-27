import type { OeffentlichesObjekt } from "@/lib/objektsuche"
import { formatZahl, nutzungLabel } from "./anzeige"
import { preisText, verfuegbarText } from "./detail"

type Props = { objekt: OeffentlichesObjekt; heute: string }

export function Eckdaten({ objekt, heute }: Props) {
  const zeilen: [string, string][] = [
    ["Fläche", `${formatZahl(objekt.flaeche)} m²`],
    ["Preis pro m²/Jahr", preisText(objekt.preis_pro_m2)],
    ["Nutzung", nutzungLabel(objekt.nutzung) ?? objekt.nutzung],
    ["Verfügbar ab", verfuegbarText(objekt.verfuegbar_ab, heute)],
    ["Ort", objekt.ort],
  ]
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-card border border-line bg-surface p-5">
      {zeilen.map(([label, wert]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium tracking-wide text-ink-3 uppercase">{label}</dt>
          <dd className="font-semibold text-ink tabular-nums">{wert}</dd>
        </div>
      ))}
    </dl>
  )
}
