"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { AbschlussDialog } from "@/components/abschluss/AbschlussDialog"
import { AbschlussRueckmeldung } from "@/components/abschluss/AbschlussRueckmeldung"
import { useAbschlussLauf } from "@/components/abschluss/useAbschlussLauf"
import { trefferAblehnen } from "@/app/actions/abschluss"
import { AKTION_FRAGE, AKTION_LABEL, folgenText } from "@/lib/abschluss/folgen-text"

type Props = {
  matchId: string
  // Nur solange der Treffer noch "Angeboten" ist; danach bleibt die Rückmeldung sichtbar.
  angeboten: boolean
}

// Antwort ohne Interesse auf ein Angebot (Spec §2): Treffer gesendet -> abgelehnt, keine Mail.
export function FirmaLehntAb({ matchId, angeboten }: Props) {
  const router = useRouter()
  const lauf = useAbschlussLauf(0, () => router.refresh())

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {angeboten && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-ink-2">Die Firma hat laut Einordnung kein Interesse am Angebot.</p>
          <Button disabled={lauf.laufend} onClick={lauf.oeffneDialog}>
            {AKTION_LABEL.ablehnen}
          </Button>
        </div>
      )}
      <AbschlussRueckmeldung lauf={lauf} bezeichnung="Angebot" fehlendeAnzeigen={false} />
      <AbschlussDialog
        offen={lauf.dialogOffen}
        inhalt={{ frage: AKTION_FRAGE.ablehnen, folgen: folgenText("ablehnen", 0), label: AKTION_LABEL.ablehnen }}
        laufend={lauf.laufend}
        onBestaetigen={() => void lauf.bestaetigen(() => trefferAblehnen(matchId), `${AKTION_LABEL.ablehnen}: gespeichert`)}
        onAbbrechen={lauf.schliesseDialog}
        onFokusNachSchliessen={lauf.fokusNachSchliessen}
      />
    </div>
  )
}
