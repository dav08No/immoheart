import { formatZeitpunkt } from "@/lib/format"
import type { NachrichtRow } from "@/lib/queries/nachrichten"

// Schreibgeschützte Ansicht einer bereits versendeten Mail -- versand_fehler
// gibt es hier nicht mehr, der Versand war ja erfolgreich.
export function GesendetDetail({ nachricht }: { nachricht: NachrichtRow }) {
  return (
    <div>
      <div className="border-b border-line p-4">
        <div className="wrap-break-word font-display text-base font-bold text-ink">{nachricht.betreff}</div>
        <div className="mt-0.5 text-xs text-ink-3 wrap-anywhere">
          An {nachricht.an}
          {nachricht.gesendet_am && ` · gesendet am ${formatZeitpunkt(new Date(nachricht.gesendet_am))}`}
        </div>
      </div>
      <div className="p-4">
        <div className="whitespace-pre-wrap wrap-break-word rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
          {nachricht.body}
        </div>
      </div>
    </div>
  )
}
