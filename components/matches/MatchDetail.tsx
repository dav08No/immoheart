"use client"

import { useEffect, useState } from "react"
import { Drawer } from "@/components/layout/Drawer"
import type { NeuerMatch } from "@/lib/queries/matches"
import type { KriteriumStatus } from "@/types"

const STATUS_ZEICHEN: Record<KriteriumStatus, string> = { ok: "✓", teilweise: "~", nein: "✕" }
const STATUS_FARBE: Record<KriteriumStatus, string> = { ok: "text-good", teilweise: "text-warn", nein: "text-crit" }

export function MatchDetail({
  match, offen, onSchliessen, onSenden, onVerwerfen,
}: {
  match: NeuerMatch | null
  offen: boolean
  onSchliessen: () => void
  onSenden: () => void
  onVerwerfen: () => void
}) {
  // Drawer (components/layout/Drawer.tsx) bleibt unabhängig von `offen` immer gemountet
  // und animiert den Übergang rein über CSS (translate-x/opacity, siehe dort). Ein
  // `if (!match) return null` hier (so der Plan-Doc-Startcode) würde beim Schliessen --
  // der noch nicht gebaute Aufrufer (MatchesAnsicht/Task 65) setzt `match` dann auf
  // null -- sofort das gesamte <Drawer>-DOM entfernen, bevor die Schliessen-Transition
  // spielen konnte: dasselbe Problem wie bei AnfrageDetail (M6) und ObjektFormular/
  // ObjekteAnsicht (M7). Anders als bei AnfrageDetail braucht es dafür aber keine
  // Änderung beim Aufrufer (letzteAnfrage-State in AnfragenAnsicht) und keinen Ref-
  // Staleness-Guard: MatchDetail hat keinen eigenen Bearbeiten-State und keine eigenen
  // async Aufrufe, deren verspätete Antwort einen veralteten State überschreiben
  // könnte -- reines Anzeigen plus Weiterreichen von Callbacks. Ein simpler "letzten
  // Match merken"-State genügt daher hier.
  const [letzterMatch, setLetzterMatch] = useState(match)
  useEffect(() => {
    if (match) setLetzterMatch(match)
  }, [match])

  // Vor der allerersten Auswahl ist letzterMatch noch null -- dann wurde der Drawer
  // noch nie geöffnet, es gibt nichts zu animieren.
  if (!letzterMatch) return null

  return (
    <Drawer
      offen={offen}
      onSchliessen={onSchliessen}
      titel={`${letzterMatch.score}% Treffer`}
      untertitel={`${letzterMatch.objekt.titel} ↔ ${letzterMatch.firma?.name ?? "?"}`}
    >
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th></th>
            <th className="pb-1.5 text-left font-medium text-ink-3">Gesucht</th>
            <th className="pb-1.5 text-left font-medium text-ink-3">Objekt</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {letzterMatch.kriterien.map((k) => (
            <tr key={k.kriterium} className="border-b border-line last:border-b-0">
              <td className="py-2 pr-2 text-ink-3">{k.kriterium}</td>
              <td className="py-2 pr-2">{k.gesucht}</td>
              <td className="py-2 pr-2">{k.angeboten}</td>
              <td className={`py-2 text-right font-bold ${STATUS_FARBE[k.status]}`}>{STATUS_ZEICHEN[k.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-ink-2">{letzterMatch.hinweis}</p>
      <div className="flex gap-2">
        <button onClick={onSenden} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-on-brand">
          Angebot senden
        </button>
        <button onClick={onVerwerfen} className="rounded-lg border border-line-2 px-3 py-1.5 text-sm text-ink">
          Verwerfen
        </button>
      </div>
    </Drawer>
  )
}
