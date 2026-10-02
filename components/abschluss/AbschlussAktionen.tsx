"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { reservierungAufheben, trefferAblehnen, trefferReservieren, trefferVermitteln } from "@/app/actions/abschluss"
import { AKTION_FRAGE, AKTION_LABEL, folgenText, istPrimaerAktion, sichtbareAktionen } from "@/lib/abschluss/folgen-text"
import type { ObjektStatus, TrefferAktion, TrefferStatus } from "@/lib/abschluss/uebergaenge"
import type { Database } from "@/types/database"
import { AbschlussDialog } from "./AbschlussDialog"
import { AbschlussRueckmeldung } from "./AbschlussRueckmeldung"
import { useAbschlussLauf, type AbschlussErgebnis } from "./useAbschlussLauf"

type AnfrageStatus = Database["public"]["Enums"]["anfrage_status_enum"]

const AUSFUEHREN: Record<TrefferAktion, (matchId: string) => Promise<AbschlussErgebnis>> = {
  reservieren: trefferReservieren,
  vermitteln: trefferVermitteln,
  aufheben: reservierungAufheben,
  ablehnen: trefferAblehnen,
}

type Props = {
  matchId: string
  objektId: string
  // Kontext für die Knöpfe, z.B. Objekt- oder Firmenname (zugänglicher Name je Zeile).
  bezeichnung: string
  trefferStatus: TrefferStatus
  objektStatus: ObjektStatus
  anfrageStatus: AnfrageStatus
  andereAngebote: number
  fehlendeEntwuerfe: number
  // Objekt-Panel: alle Zeilen teilen dasselbe Objekt, die Zahl steht dort einmal oben.
  fehlendeAnzeigen?: boolean
  onFertig: () => void
}

// Wiederverwendbar (Anfrage- und Objekt-Panel): Knöpfe aus den erlaubten Übergängen,
// Bestätigungsdialog mit Folgen, danach Hinweise und ggf. "Entwürfe erneut erzeugen".
export function AbschlussAktionen(p: Props) {
  const [aktion, setAktion] = useState<TrefferAktion | null>(null)
  const lauf = useAbschlussLauf(p.fehlendeEntwuerfe, p.onFertig)
  const aktionen = sichtbareAktionen(p.trefferStatus, p.objektStatus, p.anfrageStatus)

  function bestaetigen() {
    if (!aktion) return
    const gewaehlt = aktion
    void lauf.bestaetigen(() => AUSFUEHREN[gewaehlt](p.matchId), `${AKTION_LABEL[gewaehlt]}: gespeichert`)
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {aktionen.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2">
          {aktionen.map((a) => (
            <Button
              key={a}
              variante={istPrimaerAktion(a) ? "primaer" : "sekundaer"}
              aria-label={`${AKTION_LABEL[a]}: ${p.bezeichnung}`}
              disabled={lauf.laufend}
              onClick={() => {
                setAktion(a)
                lauf.oeffneDialog()
              }}
            >
              {AKTION_LABEL[a]}
            </Button>
          ))}
        </div>
      )}
      <AbschlussRueckmeldung lauf={lauf} objektId={p.objektId} bezeichnung={p.bezeichnung} fehlendeAnzeigen={p.fehlendeAnzeigen} />
      <AbschlussDialog
        offen={lauf.dialogOffen}
        inhalt={aktion && { frage: AKTION_FRAGE[aktion], folgen: folgenText(aktion, p.andereAngebote), label: AKTION_LABEL[aktion] }}
        laufend={lauf.laufend}
        onBestaetigen={bestaetigen}
        onAbbrechen={lauf.schliesseDialog}
        onFokusNachSchliessen={lauf.fokusNachSchliessen}
      />
    </div>
  )
}
