"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { StatusChip } from "@/components/ui/StatusChip"
import { AbschlussDialog, type DialogInhalt } from "@/components/abschluss/AbschlussDialog"
import { AbschlussRueckmeldung } from "@/components/abschluss/AbschlussRueckmeldung"
import { useAbschlussLauf } from "@/components/abschluss/useAbschlussLauf"
import { objektNichtVerfuegbar, objektWiederVerfuegbar } from "@/app/actions/abschluss"
import { absageEmpfaenger } from "@/lib/abschluss/interessenten"
import { OBJEKT_AKTION_FRAGE, objektFolgenText } from "@/lib/abschluss/objekt-folgen"
import { meldungsAktion, type MeldungsAktion } from "@/lib/abschluss/postfach-aktionen"
import { objektStatusTon } from "@/lib/ui/status-ton"
import type { Aenderung } from "@/lib/ki/einordnung"
import type { ObjektInteressentenDaten } from "@/lib/queries/interessenten"

// Postfach-Beschriftung (Spec §2) statt der Objekt-Panel-Labels: die Mail sagt "vermietet".
const LABEL: Record<MeldungsAktion, string> = {
  nicht_verfuegbar: "Objekt als vermietet markieren",
  wieder_verfuegbar: "Wieder verfügbar setzen",
}

const STATUS_LABEL = { verfuegbar: "Verfügbar", reserviert: "Reserviert", vermietet: "Vermietet" } as const

type Props = { eingangId: string; objektId: string; titel: string; aenderung: Aenderung }

// Lädt Status, offene Angebote und fehlende Entwürfe frisch über dieselbe Route wie das
// Objekt-Panel: die Folgen im Dialog (Zahl der Absagen) müssen zum aktuellen Stand passen.
export function ObjektmeldungAktion({ eingangId, objektId, titel, aenderung }: Props) {
  const router = useRouter()
  const [daten, setDaten] = useState<ObjektInteressentenDaten | null>(null)
  const [ladeFehler, setLadeFehler] = useState(false)
  // Beim Öffnen festgehalten: nach Erfolg lädt der Status neu und die Aktion fällt weg,
  // der Dialogtext soll während der Ausblende-Animation aber stehen bleiben.
  const [gewaehlt, setGewaehlt] = useState<{ aktion: MeldungsAktion; inhalt: DialogInhalt } | null>(null)

  const laden = useCallback(async () => {
    try {
      const res = await fetch(`/api/objekte/${objektId}/interessenten`)
      if (!res.ok) throw new Error(`Serverfehler (${res.status})`)
      setDaten((await res.json()) as ObjektInteressentenDaten)
      setLadeFehler(false)
    } catch (e) {
      console.error("ObjektmeldungAktion: Laden fehlgeschlagen", e)
      setLadeFehler(true)
    }
  }, [objektId])

  useEffect(() => {
    void laden()
  }, [laden])

  const lauf = useAbschlussLauf(daten?.fehlendeEntwuerfe ?? 0, () => {
    void laden()
    router.refresh()
  })
  const aktion = daten ? meldungsAktion(aenderung, daten.objektStatus) : null

  function oeffnen(a: MeldungsAktion, d: ObjektInteressentenDaten) {
    const folgen = objektFolgenText(a, absageEmpfaenger(d.interessenten))
    setGewaehlt({ aktion: a, inhalt: { frage: OBJEKT_AKTION_FRAGE[a], folgen, label: LABEL[a] } })
    lauf.oeffneDialog()
  }

  function bestaetigen() {
    if (!gewaehlt) return
    const a = gewaehlt.aktion
    const schritt = a === "nicht_verfuegbar" ? () => objektNichtVerfuegbar(objektId, eingangId) : () => objektWiederVerfuegbar(objektId)
    void lauf.bestaetigen(schritt, `${LABEL[a]}: gespeichert`)
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {ladeFehler && (
        <p role="alert" className="text-sm text-crit">
          Objektstatus konnte nicht geladen werden.
        </p>
      )}
      {daten && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
          Aktueller Status
          <StatusChip ton={objektStatusTon(daten.objektStatus)}>{STATUS_LABEL[daten.objektStatus]}</StatusChip>
        </div>
      )}
      {/* Ruling R3: Statusaktion als Primäraktion rechts; ohne passende Aktion (sonstige
          Änderung oder Status passt schon) bleibt nur "Objekt öffnen". */}
      <div className="flex flex-wrap justify-end gap-2">
        {(daten || ladeFehler) && !aktion && <Button onClick={() => router.push(`/admin/objekte?id=${objektId}`)}>Objekt öffnen</Button>}
        {aktion && daten && (
          <Button
            variante="primaer"
            aria-label={`${LABEL[aktion]}: ${titel}`}
            disabled={lauf.laufend}
            onClick={() => oeffnen(aktion, daten)}
          >
            {LABEL[aktion]}
          </Button>
        )}
      </div>
      {daten && !aktion && aenderung !== "sonstige_aenderung" && (
        <p className="text-xs text-ink-2">Der Objektstatus passt bereits zur Meldung.</p>
      )}
      <AbschlussRueckmeldung lauf={lauf} objektId={objektId} bezeichnung={titel} />
      <AbschlussDialog
        offen={lauf.dialogOffen}
        inhalt={gewaehlt?.inhalt ?? null}
        laufend={lauf.laufend}
        onBestaetigen={bestaetigen}
        onAbbrechen={lauf.schliesseDialog}
        onFokusNachSchliessen={lauf.fokusNachSchliessen}
      />
    </div>
  )
}
