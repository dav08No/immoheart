"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { AbschlussDialog } from "@/components/abschluss/AbschlussDialog"
import { AbschlussRueckmeldung } from "@/components/abschluss/AbschlussRueckmeldung"
import { useAbschlussLauf, type AbschlussErgebnis } from "@/components/abschluss/useAbschlussLauf"
import { objektNichtVerfuegbar, objektWiederVerfuegbar } from "@/app/actions/abschluss"
import {
  OBJEKT_AKTION_FRAGE,
  OBJEKT_AKTION_LABEL,
  objektAktionen,
  objektFolgenText,
  type ObjektAktion,
} from "@/lib/abschluss/objekt-folgen"
import type { ObjektStatus } from "@/lib/abschluss/uebergaenge"

const AUSFUEHREN: Record<ObjektAktion, (objektId: string) => Promise<AbschlussErgebnis>> = {
  nicht_verfuegbar: (id) => objektNichtVerfuegbar(id),
  wieder_verfuegbar: objektWiederVerfuegbar,
}

type Props = {
  objektId: string
  titel: string
  objektStatus: ObjektStatus
  // Treffer, die bei "Nicht mehr verfügbar" einen Absage-Entwurf erhalten.
  absagen: number
  fehlendeEntwuerfe: number
  onFertig: () => void
}

// Status nur noch über Aktionen (Spec §3): Objekt schliessen oder wieder freigeben,
// jeweils mit Bestätigung; danach dieselbe Rückmeldung wie bei den Treffer-Aktionen.
export function ObjektStatusAktionen(p: Props) {
  const [aktion, setAktion] = useState<ObjektAktion | null>(null)
  const lauf = useAbschlussLauf(p.fehlendeEntwuerfe, p.onFertig)

  function bestaetigen() {
    if (!aktion) return
    const gewaehlt = aktion
    void lauf.bestaetigen(() => AUSFUEHREN[gewaehlt](p.objektId), `${OBJEKT_AKTION_LABEL[gewaehlt]}: gespeichert`)
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {objektAktionen(p.objektStatus).map((a) => (
          <Button
            key={a}
            aria-label={`${OBJEKT_AKTION_LABEL[a]}: ${p.titel}`}
            disabled={lauf.laufend}
            onClick={() => {
              setAktion(a)
              lauf.oeffneDialog()
            }}
          >
            {OBJEKT_AKTION_LABEL[a]}
          </Button>
        ))}
      </div>
      <AbschlussRueckmeldung lauf={lauf} objektId={p.objektId} bezeichnung={p.titel} />
      <AbschlussDialog
        offen={lauf.dialogOffen}
        inhalt={
          aktion && {
            frage: OBJEKT_AKTION_FRAGE[aktion],
            folgen: objektFolgenText(aktion, p.absagen),
            label: OBJEKT_AKTION_LABEL[aktion],
          }
        }
        laufend={lauf.laufend}
        onBestaetigen={bestaetigen}
        onAbbrechen={lauf.schliesseDialog}
        onFokusNachSchliessen={lauf.fokusNachSchliessen}
      />
    </div>
  )
}
