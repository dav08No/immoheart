"use client"

import { regelUmschalten } from "@/app/actions/regeln"
import type { RegelRow } from "@/lib/queries/regeln"

export function RegelnListe({ regeln }: { regeln: RegelRow[] }) {
  return (
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
            onClick={() => void regelUmschalten(r.id, !r.aktiv)}
            className="rounded-lg border border-line-2 px-2 py-1 text-xs text-ink hover:bg-surface-2"
          >
            {r.aktiv ? "Deaktivieren" : "Aktivieren"}
          </button>
        </div>
      ))}
    </div>
  )
}
