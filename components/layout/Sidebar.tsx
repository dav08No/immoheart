"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { Profil } from "@/types"
import { FreigabeSchalter } from "./FreigabeSchalter"

const EINTRAEGE = [
  { pfad: "/", label: "Matches", icon: "◈" },
  { pfad: "/postfach", label: "Postfach", icon: "✉" },
  { pfad: "/anfragen", label: "Anfragen", icon: "↘" },
  { pfad: "/objekte", label: "Objekte", icon: "▤" },
  { pfad: "/regeln", label: "Regeln", icon: "§" },
  { pfad: "/zahlen", label: "Zahlen", icon: "▁" },
]

export function Sidebar({ profil }: { profil: Profil }) {
  const pfad = usePathname()
  // .filter(Boolean) faengt zwei Faelle ab: mehrfache Leerzeichen im Namen
  // ("John  Doe".split(" ") enthaelt ein leeres Element) und einen leeren
  // Namen insgesamt ("".split(" ") -> [""]). In beiden Faellen liefert
  // teil[0] zur Laufzeit `undefined` (TypeScript typisiert String-Indexzugriff
  // als `string`, auch unter noUncheckedIndexedAccess -- eine bekannte Luecke
  // nur bei String-Indizierung), was ohne den Filter als Text "undefined" im
  // Kreis landen wuerde. Der "?"-Fallback folgt der Feld-Konvention aus M4
  // Task 30 fuer fehlende Werte.
  const initialen =
    profil.name
      .split(" ")
      .map((teil) => teil[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"

  return (
    <aside className="flex h-screen w-[206px] flex-none flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-2 px-4 pb-3.5 pt-4">
        <span className="font-display text-lg font-bold text-ink">immoheart</span>
      </div>
      <span className="border-b border-line px-4 pb-3.5 text-xs text-ink-3">espaceSOLOTHURN</span>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2.5">
        {EINTRAEGE.map((eintrag) => {
          const aktiv = pfad === eintrag.pfad
          return (
            <Link
              key={eintrag.pfad}
              href={eintrag.pfad}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${
                aktiv ? "bg-brand-soft font-semibold text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <span className="w-4 text-center text-xs opacity-80">{eintrag.icon}</span>
              {eintrag.label}
            </Link>
          )
        })}
      </nav>

      <FreigabeSchalter aktuelleStufe={profil.freigabe_stufe as 1 | 2 | 3} />

      <div className="flex items-center gap-2.5 border-t border-line px-4 py-3 text-xs text-ink-2">
        <span className="grid h-[27px] w-[27px] place-items-center rounded-full bg-brand text-[11px] font-semibold text-on-brand">
          {initialen}
        </span>
        {profil.name}
      </div>
    </aside>
  )
}
