"use client"

import { useEffect, useState } from "react"
import { Drawer } from "@/components/layout/Drawer"
import { Button } from "@/components/ui/Button"
import { StatusChip } from "@/components/ui/StatusChip"
import type { NeuerMatch } from "@/lib/queries/matches"
import type { KriteriumStatus } from "@/types"

const STATUS_ZEICHEN: Record<KriteriumStatus, string> = { ok: "✓", teilweise: "~", nein: "✕" }
const STATUS_FARBE: Record<KriteriumStatus, string> = { ok: "text-good", teilweise: "text-warn", nein: "text-crit" }

export function MatchDetail({
  match, offen, laufend, onSchliessen, onSenden, onVerwerfen,
}: {
  match: NeuerMatch | null
  offen: boolean
  laufend: boolean
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
      titel={letzterMatch.objekt.titel}
      untertitel={`↔ ${letzterMatch.firma?.name ?? "?"}`}
      chip={<StatusChip ton="neutral">{letzterMatch.score}% Treffer</StatusChip>}
      fuss={
        <>
          <Button variante="sekundaer" onClick={onVerwerfen} disabled={laufend}>
            Verwerfen
          </Button>
          <Button variante="primaer" onClick={onSenden} disabled={laufend}>
            {laufend ? "Wird bearbeitet…" : letzterMatch.hatEntwurf ? "Entwurf öffnen" : "Angebot entwerfen"}
          </Button>
        </>
      }
    >
      <table className="w-full border-collapse text-xs wrap-break-word">
        <thead>
          <tr>
            <th></th>
            <th className="pb-1.5 text-left font-medium text-ink-2">Gesucht</th>
            <th className="pb-1.5 text-left font-medium text-ink-2">Objekt</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {letzterMatch.kriterien.map((k) => (
            <tr key={k.kriterium} className="border-b border-line last:border-b-0">
              <td className="py-2 pr-2 text-ink-2">{k.kriterium}</td>
              <td className="py-2 pr-2">{k.gesucht}</td>
              <td className="py-2 pr-2">{k.angeboten}</td>
              <td className={`py-2 text-right font-bold ${STATUS_FARBE[k.status]}`}>{STATUS_ZEICHEN[k.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-ink-2">{letzterMatch.hinweis}</p>
    </Drawer>
  )
}
