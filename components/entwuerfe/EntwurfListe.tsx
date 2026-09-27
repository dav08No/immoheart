import type { EntwurfMitBezug } from "@/lib/queries/nachrichten"
import type { Database } from "@/types/database"

type NachrichtTyp = Database["public"]["Enums"]["nachricht_typ_enum"]

// Feste Reihenfolge/Gruppierung statt alphabetisch oder nach created_at: die
// Nutzerin soll Antworten auf eingehende Anfragen (am dringendsten) zuerst
// sehen, freie Mails (typischerweise weniger zeitkritisch) zuletzt.
const GRUPPEN: { titel: string; typen: NachrichtTyp[] }[] = [
  { titel: "Antworten", typen: ["antwort", "rueckfrage"] },
  { titel: "Angebote", typen: ["angebot"] },
  { titel: "Nachfass", typen: ["nachfass"] },
  { titel: "Frei", typen: ["frei"] },
]

export function EntwurfListe({
  entwuerfe,
  ausgewaehlteId,
  onAuswahl,
}: {
  entwuerfe: EntwurfMitBezug[]
  ausgewaehlteId: string | null
  onAuswahl: (id: string) => void
}) {
  return (
    <div className="rounded-card border border-line bg-surface">
      {entwuerfe.length === 0 && <p className="p-6 text-center text-sm text-ink-3">Keine offenen Entwürfe.</p>}
      {GRUPPEN.map(({ titel, typen }) => {
        const eintraege = entwuerfe.filter((entwurf) => typen.includes(entwurf.typ))
        if (eintraege.length === 0) return null
        return (
          <div key={titel}>
            <div className="border-b border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink-3">{titel}</div>
            {eintraege.map((entwurf) => {
              // gesendet_am gesetzt, aber richtung noch "entwurf": der Versand ist
              // entweder gerade im Gange oder nach einem Absturz stecken geblieben
              // (siehe reservierungFreigeben) -- in beiden Fällen unklar, ob die
              // Mail bereits raus ist, deshalb eigene Markierung statt versand_fehler.
              const unklar = entwurf.gesendet_am !== null
              return (
                <button
                  key={entwurf.id}
                  onClick={() => onAuswahl(entwurf.id)}
                  aria-current={entwurf.id === ausgewaehlteId ? "true" : undefined}
                  className={`flex w-full flex-col gap-0.5 border-b border-line p-3 text-left last:border-b-0 hover:bg-surface-2 ${
                    entwurf.id === ausgewaehlteId ? "bg-brand-soft" : ""
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-ink">{entwurf.betreff}</span>
                    {unklar ? (
                      <span className="inline-flex flex-none items-center gap-1 text-[11px] text-warn">
                        <span className="size-1.5 rounded-full bg-warn" aria-hidden />
                        Versand unklar
                      </span>
                    ) : (
                      entwurf.versand_fehler && (
                        <span
                          className="size-1.5 flex-none rounded-full bg-crit"
                          aria-hidden
                          title="Fehler beim letzten Versand"
                        />
                      )
                    )}
                  </span>
                  <span className="truncate text-xs text-ink-3">
                    {entwurf.an}
                    {entwurf.bezug && ` · ${entwurf.bezug}`}
                  </span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
