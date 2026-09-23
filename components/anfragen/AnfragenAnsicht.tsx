"use client"

import { useEffect, useRef, useState } from "react"
import { AnfragenTabelle } from "./AnfragenTabelle"
import { AnfrageDetail } from "./AnfrageDetail"
import { AnfrageFormular } from "./AnfrageFormular"
import { Drawer } from "@/components/layout/Drawer"
import { Button } from "@/components/ui/Button"
import type { AnfrageMitFirma, VerlaufEintrag } from "@/lib/queries/anfragen"
import type { Kriterium } from "@/types"

type BesterMatch = { score: number; kriterien: Kriterium[]; objekte: { titel: string } | null } | null
type DetailDaten = { besterMatch: BesterMatch; verlauf: VerlaufEintrag[] }

const DETAIL_LEER: DetailDaten = { besterMatch: null, verlauf: [] }

export function AnfragenAnsicht({ anfragen }: { anfragen: AnfrageMitFirma[] }) {
  const [ausgewaehlteId, setAusgewaehlteId] = useState<string | null>(null)
  const [sofortBearbeiten, setSofortBearbeiten] = useState(false)
  const [neuOffen, setNeuOffen] = useState(false)
  const [detailDaten, setDetailDaten] = useState<DetailDaten>(DETAIL_LEER)
  // Sichtbarer, aber bewusst zurückhaltender Hinweis: die GET /api/anfragen/[id]/detail-
  // Route ist ein reiner Lesezugriff, kein Speichervorgang -- ein Fehlschlag hier
  // bedeutet nicht "diese Anfrage hat noch keine Treffer", sondern "wir konnten die
  // Treffer/den Verlauf gerade nicht laden". Ohne dieses Flag sähen beide Fälle im
  // Drawer identisch aus (leere Bester-Treffer-Sektion, leerer Verlauf), was einen
  // Netzwerk- oder Serverfehler unsichtbar macht (Milestone-Konvention: Fehler nie
  // stillschweigend verschlucken, siehe AnfrageFormular/AnfrageDetail).
  const [detailFehler, setDetailFehler] = useState(false)

  const ausgewaehlt = anfragen.find((a) => a.id === ausgewaehlteId) ?? null

  // Drawer (components/layout/Drawer.tsx) ist so gebaut, dass es unabhängig von
  // `offen` immer gemountet bleibt und den Übergang rein über CSS-Transitions auf
  // `translate-x`/`opacity` abbildet (siehe dort) -- genau wie der "Neue Anfrage"-
  // Drawer unten, der immer gerendert wird und nur `offen`/`neuOffen` umschaltet.
  // AnfrageDetail rendert seinerseits selbst ein <Drawer>; würde AnfrageDetail hier
  // nur `{ausgewaehlt && <AnfrageDetail .../>}` konditional gerendert (so der
  // Startcode aus dem Plan), verschwände beim Schliessen (setAusgewaehlteId(null))
  // sofort auch das <Drawer>-DOM-Element -- die Schliessen-Transition (translate-x
  // zurück nach rechts) hätte keine Chance zu spielen, das Panel würde einfach
  // hart verschwinden. `letzteAnfrage` hält deshalb die zuletzt ausgewählte Anfrage
  // fest, damit AnfrageDetail (und sein inneres Drawer) nach der ersten Auswahl
  // dauerhaft gemountet bleibt; nur noch `offen` steuert Sichtbarkeit/Animation.
  const [letzteAnfrage, setLetzteAnfrage] = useState<AnfrageMitFirma | null>(null)
  useEffect(() => {
    if (ausgewaehlt) setLetzteAnfrage(ausgewaehlt)
  }, [ausgewaehlt])

  // Guard gegen veraltete fetch-Antworten: wechselt die Nutzerin schnell zu einer
  // anderen Zeile (oder schliesst den Drawer), während eine vorherige Anfrage für
  // /detail noch unterwegs ist, darf deren verspätete Antwort nicht mehr den State
  // überschreiben (gleiches Muster wie anfrageIdRef in AnfrageDetail, nachrichtIdRef
  // in EntwurfDetail, ausgewaehlteIdRef in PostfachAnsicht).
  const ausgewaehlteIdRef = useRef(ausgewaehlteId)
  useEffect(() => {
    ausgewaehlteIdRef.current = ausgewaehlteId
  }, [ausgewaehlteId])

  function zeileWaehlen(id: string, bearbeitenSofort: boolean) {
    setAusgewaehlteId(id)
    setSofortBearbeiten(bearbeitenSofort)
  }

  // Aus dem useEffect unten (Auswahlwechsel) UND aus onAenderungGespeichert (nach
  // erfolgreichem Speichern in AnfrageDetail) aufgerufen -- siehe Kommentar bei
  // matchesVeraltet in AnfrageDetail.tsx: anfrageAktualisieren löst serverseitig ein
  // Rematching aus, aber `detailDaten` ist ein einmalig geladenes fetch-Ergebnis,
  // keine live Subscription. Ohne erneuten Aufruf hier bliebe der Bester-Treffer-
  // Abschnitt nach einem Edit auf dem veralteten Stand hängen (AnfrageDetail zeigt
  // zwar einen "matchesVeraltet"-Hinweistext an, lädt aber selbst nichts nach).
  async function ladeDetailDaten(id: string) {
    try {
      const res = await fetch(`/api/anfragen/${id}/detail`)
      if (!res.ok) throw new Error(`Serverfehler (${res.status})`)
      const daten = (await res.json()) as DetailDaten
      if (ausgewaehlteIdRef.current !== id) return
      setDetailDaten(daten)
      setDetailFehler(false)
    } catch (e) {
      console.error("AnfragenAnsicht: Bester Treffer/Verlauf konnten nicht geladen werden", e)
      if (ausgewaehlteIdRef.current !== id) return
      setDetailDaten(DETAIL_LEER)
      setDetailFehler(true)
    }
  }

  useEffect(() => {
    if (!ausgewaehlteId) {
      setDetailDaten(DETAIL_LEER)
      setDetailFehler(false)
      return
    }
    setDetailFehler(false)
    void ladeDetailDaten(ausgewaehlteId)
  }, [ausgewaehlteId])

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button variante="primaer" onClick={() => setNeuOffen(true)}>Neue Anfrage</Button>
      </div>
      {detailFehler && (
        <div className="mb-3 rounded-lg border border-crit/30 bg-crit/5 px-3 py-2 text-xs text-crit">
          Bester Treffer und Verlauf konnten nicht geladen werden. Erneut auf die Zeile klicken, um es noch einmal zu
          versuchen.
        </div>
      )}
      <AnfragenTabelle anfragen={anfragen} onZeileWahl={zeileWaehlen} />
      <p className="mt-2 text-xs text-ink-3">? = Angabe fehlt noch</p>

      {letzteAnfrage && (
        <AnfrageDetail
          anfrage={letzteAnfrage}
          besterMatch={detailDaten.besterMatch}
          verlauf={detailDaten.verlauf}
          offen={ausgewaehlteId !== null}
          sofortBearbeiten={sofortBearbeiten}
          onSchliessen={() => setAusgewaehlteId(null)}
          onAenderungGespeichert={() => {
            if (ausgewaehlteIdRef.current) void ladeDetailDaten(ausgewaehlteIdRef.current)
          }}
        />
      )}

      <Drawer offen={neuOffen} titel="Neue Anfrage" untertitel="" onSchliessen={() => setNeuOffen(false)}>
        <AnfrageFormular onFertig={() => setNeuOffen(false)} />
      </Drawer>
    </>
  )
}
