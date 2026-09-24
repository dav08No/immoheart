"use client"

import { useState } from "react"
import { regelUmschalten } from "@/app/actions/regeln"
import type { RegelRow } from "@/lib/queries/regeln"

export function RegelnListe({ regeln }: { regeln: RegelRow[] }) {
  // Ein einziger listenweiter Banner statt eines Fehler-States pro Zeile,
  // gleiches Muster wie MatchesAnsicht (Kommentar dort): mehrere unabhängige
  // Zeilen-Aktionen, ein Banner reicht, solange er die betroffene Regel
  // (code/beschreibung) benennt -- die Zeile selbst bleibt bei einem Fehler
  // unverändert sichtbar (kein revalidatePath ohne Erfolg).
  const [fehler, setFehler] = useState<string | null>(null)
  // Nur die gerade umschaltende Zeile sperren (nicht alle): eine setzeRegelAktiv-
  // Zeile setzt genau eine Regel, es gibt keinen Grund, unbeteiligte Zeilen
  // während des Umschaltens zu blockieren. Verhindert primär ein Doppel-Klick-
  // Doppelfeuern auf derselben Zeile, während der Server Action läuft.
  const [laufendId, setLaufendId] = useState<string | null>(null)

  async function umschalten(r: RegelRow) {
    setFehler(null)
    setLaufendId(r.id)
    try {
      await regelUmschalten(r.id, !r.aktiv)
    } catch (e) {
      const meldung = e instanceof Error ? e.message : String(e)
      setFehler(`Umschalten fehlgeschlagen (${r.code} ${r.beschreibung}): ${meldung}`)
    } finally {
      setLaufendId(null)
    }
  }

  return (
    <>
      {fehler && (
        <div className="mb-3 rounded-lg border border-crit/30 bg-crit/5 px-3 py-2 text-xs text-crit">{fehler}</div>
      )}
      <div className="rounded-card border border-line bg-surface">
        {regeln.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[52px_minmax(0,1fr)_auto_auto] items-baseline gap-3 border-b border-line p-3.5 last:border-b-0"
          >
            <span className="text-xs font-semibold text-brand">{r.code}</span>
            <span className={`text-sm ${r.aktiv ? "text-ink" : "text-ink-3 line-through"}`}>{r.beschreibung}</span>
            <span className="text-xs text-ink-3">{r.angewendet_count}×</span>
            <button
              onClick={() => void umschalten(r)}
              disabled={laufendId === r.id}
              className="rounded-lg border border-line-2 px-2 py-1 text-xs text-ink hover:bg-surface-2 disabled:opacity-50"
            >
              {laufendId === r.id ? "…" : r.aktiv ? "Deaktivieren" : "Aktivieren"}
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
