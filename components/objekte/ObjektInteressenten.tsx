"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Abschnittstitel } from "@/components/ui/Abschnittstitel"
import { Leerzustand } from "@/components/ui/Leerzustand"
import { ListenZeile } from "@/components/ui/ListenZeile"
import { StatusChip } from "@/components/ui/StatusChip"
import { AbschlussAktionen } from "@/components/abschluss/AbschlussAktionen"
import { ObjektStatusAktionen } from "./ObjektStatusAktionen"
import { formatZeitpunkt } from "@/lib/format"
import { absageEmpfaenger } from "@/lib/abschluss/interessenten"
import { TREFFER_STATUS_LABEL } from "@/lib/abschluss/uebergaenge"
import { trefferStatusTon } from "@/lib/ui/status-ton"
import type { ObjektInteressentenDaten } from "@/lib/queries/interessenten"

type Props = {
  objektId: string
  titel: string
  // Meldet den frisch geladenen Objektstatus an den Drawer-Kopf (der Seiten-Refresh kann
  // nach einer Aktion hinterherhinken).
  onStatus?: (status: ObjektInteressentenDaten["objektStatus"]) => void
}

// Treffer des Objekts ab "Angeboten" mit Abschluss-Aktionen je Firma, dazu die Aktionen
// am Objekt selbst (Spec §3). Lädt per fetch nach wie das Anfrage-Panel; der Elternteil
// setzt key={objektId}, ein Objektwechsel startet also mit leerem Zustand.
export function ObjektInteressenten({ objektId, titel, onStatus }: Props) {
  const router = useRouter()
  const [daten, setDaten] = useState<ObjektInteressentenDaten | null>(null)
  const [ladeFehler, setLadeFehler] = useState(false)

  const laden = useCallback(async () => {
    try {
      const res = await fetch(`/api/objekte/${objektId}/interessenten`)
      if (!res.ok) throw new Error(`Serverfehler (${res.status})`)
      const neu = (await res.json()) as ObjektInteressentenDaten
      setDaten(neu)
      onStatus?.(neu.objektStatus)
      setLadeFehler(false)
    } catch (e) {
      console.error("ObjektInteressenten: Laden fehlgeschlagen", e)
      setLadeFehler(true)
    }
  }, [objektId, onStatus])

  useEffect(() => {
    void laden()
  }, [laden])

  // Nach einer Aktion: Liste neu laden und die Seite auffrischen (Status-Chip im Kopf, Raster).
  function nachAktion() {
    void laden()
    router.refresh()
  }

  return (
    <section className="flex flex-col gap-2">
      <Abschnittstitel>Interessenten</Abschnittstitel>
      {ladeFehler && (
        <p role="alert" className="text-sm text-crit">
          Interessenten konnten nicht geladen werden.
        </p>
      )}
      {!daten ? (
        !ladeFehler && <p className="text-xs text-ink-2">Wird geladen…</p>
      ) : (
        <>
          {daten.interessenten.length === 0 ? (
            <Leerzustand klein text="Noch keine Angebote zu diesem Objekt." />
          ) : (
            <ul className="flex flex-col">
              {daten.interessenten.map((i) => (
                <li key={i.id} className="flex flex-col gap-1 border-b border-line pb-2.5 last:border-b-0">
                  <ListenZeile
                    titel={i.firma}
                    unterzeile={i.angeboten_am ? `Angeboten am ${formatZeitpunkt(new Date(i.angeboten_am))}` : undefined}
                    badges={<StatusChip ton={trefferStatusTon(i.status)}>{TREFFER_STATUS_LABEL[i.status]}</StatusChip>}
                  />
                  <div className="px-3">
                    <AbschlussAktionen
                      matchId={i.id}
                      objektId={objektId}
                      bezeichnung={i.firma}
                      trefferStatus={i.status}
                      objektStatus={daten.objektStatus}
                      anfrageStatus={i.anfrageStatus}
                      andereAngebote={i.andereAngebote}
                      fehlendeEntwuerfe={daten.fehlendeEntwuerfe}
                      fehlendeAnzeigen={false}
                      onFertig={nachAktion}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <ObjektStatusAktionen
            objektId={objektId}
            titel={titel}
            objektStatus={daten.objektStatus}
            absagen={absageEmpfaenger(daten.interessenten)}
            fehlendeEntwuerfe={daten.fehlendeEntwuerfe}
            onFertig={nachAktion}
          />
        </>
      )}
    </section>
  )
}
