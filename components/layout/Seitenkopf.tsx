import type { ReactNode } from "react"
import { ThemeUmschalter } from "@/components/theme/ThemeUmschalter"
import { MobilLeiste } from "./MobilLeiste"

type Props = { titel: string; kontext?: string; aktion?: ReactNode; aktionMobil?: ReactNode }

// Einheitlicher Kopf jeder Admin-Seite. Unter lg zugleich die obere Leiste mit
// dem Menü-Knopf (MobilLeiste); die Hauptaktion wechselt unter sm auf die
// kompakte Icon-Variante, damit 360 px ohne Querscrollen reichen. Kontextzeile
// in ink-2 statt ink-3: ink-3 erreicht auf surface keine 4.5:1.
export function Seitenkopf({ titel, kontext, aktion, aktionMobil }: Props) {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 flex-none items-center gap-2 border-b border-line bg-surface/80 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-5 lg:px-6">
      <MobilLeiste />
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-xl font-bold text-ink lg:text-2xl">{titel}</h1>
        {kontext && <p className="truncate text-sm text-ink-2">{kontext}</p>}
      </div>
      {aktion && <div className="hidden flex-none items-center gap-2 sm:flex">{aktion}</div>}
      {aktionMobil && <div className="flex flex-none items-center sm:hidden">{aktionMobil}</div>}
      <ThemeUmschalter className="flex-none" />
    </header>
  )
}

// Innenabstand der Arbeitsfläche unter dem Seitenkopf (Spec §1: 16 px Handy,
// 24 px Desktop, 16 px zwischen Panels) -- für das main jeder Seite.
export const SEITEN_INHALT_KLASSE = "flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:p-6"
