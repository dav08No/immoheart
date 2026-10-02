import { ListenZeile } from "@/components/ui/ListenZeile"
import { Abschnittstitel } from "@/components/ui/Abschnittstitel"
import { StatusChip } from "@/components/ui/StatusChip"
import { Leerzustand } from "@/components/ui/Leerzustand"
import { istPlatzhalter } from "@/lib/abschluss/entwuerfe-plan"
import { entwurfGesperrt } from "@/lib/entwurf-status"
import type { EntwurfMitBezug } from "@/lib/queries/nachrichten"
import type { Database } from "@/types/database"

type NachrichtTyp = Database["public"]["Enums"]["nachricht_typ_enum"]

// Feste Reihenfolge/Gruppierung statt alphabetisch oder nach created_at: die
// Nutzerin soll Antworten auf eingehende Anfragen (am dringendsten) zuerst
// sehen, freie Mails (typischerweise weniger zeitkritisch) zuletzt.
const GRUPPEN: { titel: string; typen: NachrichtTyp[] }[] = [
  { titel: "Antworten", typen: ["antwort", "rueckfrage"] },
  { titel: "Angebote", typen: ["angebot"] },
  { titel: "Abschluss", typen: ["absage", "eigentuemer_info", "bestaetigung"] },
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
  if (entwuerfe.length === 0) return <Leerzustand text="Keine offenen Entwürfe." klein />
  return (
    <div className="flex flex-col gap-2 p-1.5">
      {GRUPPEN.map(({ titel, typen }) => {
        const eintraege = entwuerfe.filter((entwurf) => typen.includes(entwurf.typ))
        if (eintraege.length === 0) return null
        return (
          <div key={titel} className="flex flex-col gap-0.5">
            <Abschnittstitel className="px-2.5 pt-1.5">{titel}</Abschnittstitel>
            <ul aria-label={titel} className="flex flex-col gap-0.5">
              {eintraege.map((entwurf) => {
                // gesendet_am gesetzt, aber richtung noch "entwurf": der Versand ist
                // entweder gerade im Gange oder nach einem Absturz stecken geblieben
                // (siehe reservierungFreigeben) -- in beiden Fällen unklar, ob die
                // Mail bereits raus ist, deshalb eigene Markierung statt versand_fehler.
                const unklar = entwurf.gesendet_am !== null
                const sperre = entwurfGesperrt(entwurf, entwurf.matchStatus, entwurf.objektStatus)
                return (
                  <li key={entwurf.id}>
                    <ListenZeile
                      titel={entwurf.betreff}
                      unterzeile={entwurf.bezug ? `${entwurf.an} · ${entwurf.bezug}` : entwurf.an}
                      ausgewaehlt={entwurf.id === ausgewaehlteId}
                      onClick={() => onAuswahl(entwurf.id)}
                      badges={
                        unklar ? (
                          <StatusChip ton="warn">Versand unklar</StatusChip>
                        ) : sperre ? (
                          <StatusChip ton="warn">{sperre.chip}</StatusChip>
                        ) : istPlatzhalter(entwurf) ? (
                          <StatusChip ton="warn">KI-Text fehlt</StatusChip>
                        ) : (
                          entwurf.versand_fehler && (
                            <span
                              aria-hidden
                              title="Fehler beim letzten Versand"
                              className="size-1.5 rounded-full bg-crit"
                            />
                          )
                        )
                      }
                    />
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
