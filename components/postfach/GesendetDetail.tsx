import { Abschnittstitel } from "@/components/ui/Abschnittstitel"
import { StatusChip } from "@/components/ui/StatusChip"
import { formatZeitpunkt } from "@/lib/format"
import type { NachrichtRow } from "@/lib/queries/nachrichten"

// Schreibgeschützte Ansicht einer bereits versendeten Mail -- versand_fehler
// gibt es hier nicht mehr, der Versand war ja erfolgreich.
export function GesendetDetail({ nachricht }: { nachricht: NachrichtRow }) {
  return (
    <article aria-label={nachricht.betreff}>
      <header className="flex flex-col gap-1.5 border-b border-line p-4 sm:px-5">
        <h2 className="wrap-break-word font-display text-lg font-semibold text-ink">{nachricht.betreff}</h2>
        <div className="text-xs text-ink-2 wrap-anywhere">
          An {nachricht.an}
          {nachricht.gesendet_am && ` · gesendet am ${formatZeitpunkt(new Date(nachricht.gesendet_am))}`}
        </div>
        <div>
          <StatusChip ton="gut">Gesendet</StatusChip>
        </div>
      </header>
      <section aria-label="Nachricht" className="flex flex-col gap-2 p-4 sm:p-5">
        <Abschnittstitel>Nachricht</Abschnittstitel>
        <div className="whitespace-pre-wrap wrap-break-word rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink">
          {nachricht.body}
        </div>
      </section>
    </article>
  )
}
