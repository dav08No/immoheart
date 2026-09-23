"use client"

import { useState, useTransition } from "react"
import { setzeFreigabeStufe } from "@/app/actions/profile"

const TEXTE: Record<1 | 2 | 3, string> = {
  1: "Stufe 1 · alles bestätigen",
  2: "Stufe 2 · Nachfragen automatisch",
  3: "Stufe 3 · voll autonom",
}

export function FreigabeSchalter({ aktuelleStufe }: { aktuelleStufe: 1 | 2 | 3 }) {
  const [stufe, setStufe] = useState<1 | 2 | 3>(aktuelleStufe)
  const [istPending, startTransition] = useTransition()

  function waehlen(neu: 1 | 2 | 3) {
    const vorherige = stufe
    setStufe(neu)
    startTransition(() => {
      // setzeFreigabeStufe kann werfen (ungültige Stufe, RLS-gefilterte Zeile
      // -- siehe app/actions/profile.ts). Ohne .catch() hier würde die
      // optimistische UI-Aktualisierung oben (setStufe(neu)) bei einem
      // Fehlschlag nie zurückgerollt: der Schalter zeigt dann dauerhaft eine
      // Stufe an, die serverseitig nie gesetzt wurde, ohne jeden Hinweis.
      setzeFreigabeStufe(neu).catch(() => {
        setStufe(vorherige)
      })
    })
  }

  return (
    <div className="m-2.5 rounded-card border border-line bg-surface-2 p-3">
      <span className="mb-1.5 block text-xs text-ink-3">Freigabe</span>
      <div className="flex gap-0.5 rounded-lg border border-line bg-surface p-0.5">
        {([1, 2, 3] as const).map((option) => (
          <button
            key={option}
            onClick={() => waehlen(option)}
            disabled={istPending}
            className={`flex-1 rounded-md py-1 text-xs font-semibold ${
              stufe === option ? "bg-brand text-on-brand" : "text-ink-3"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-ink-2">{TEXTE[stufe]}</p>
    </div>
  )
}
