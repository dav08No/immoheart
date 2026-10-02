"use client"

import { useEffect, useRef, useState } from "react"
import { Pencil } from "lucide-react"
import { Drawer } from "@/components/layout/Drawer"
import { Button } from "@/components/ui/Button"
import { StatusChip } from "@/components/ui/StatusChip"
import { anfrageAktualisieren } from "@/app/actions/anfragen"
import { puls } from "@/lib/puls"
import { anfrageStatusTon } from "@/lib/ui/status-ton"
import type { AnfrageMitFirma, VerlaufEintrag } from "@/lib/queries/anfragen"
import type { Angebot } from "@/lib/abschluss/angebote"
import { AnfrageEckdaten } from "./AnfrageEckdaten"
import { AnfrageBearbeiten, eingabenAus, type Eingaben } from "./AnfrageBearbeiten"
import { BesterTreffer, Verlauf } from "./AnfrageTrefferVerlauf"
import { AnfrageAngebote } from "./AnfrageAngebote"
import { ANFRAGE_STATUS_LABEL, type BesterMatch } from "./typen"

export function AnfrageDetail({
  anfrage,
  besterMatch,
  verlauf,
  angebote,
  offen,
  sofortBearbeiten,
  onSchliessen,
  onAenderungGespeichert,
}: {
  anfrage: AnfrageMitFirma
  besterMatch: BesterMatch
  verlauf: VerlaufEintrag[]
  angebote: Angebot[]
  offen: boolean
  sofortBearbeiten: boolean
  onSchliessen: () => void
  // Nach erfolgreichem Speichern: AnfragenAnsicht lädt besterMatch/verlauf neu
  // (siehe matchesVeraltet unten).
  onAenderungGespeichert?: () => void
}) {
  // sofortBearbeiten kommt von einem Klick direkt auf eine ?-Lücke in der
  // Tabelle (README-Anforderung) — dann startet der Drawer im Bearbeiten-Modus.
  const [bearbeiten, setBearbeiten] = useState(sofortBearbeiten)
  const [eingaben, setEingaben] = useState<Eingaben>(() => eingabenAus(anfrage))
  const [status, setStatus] = useState(anfrage.status)
  const [laufend, setLaufend] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  // anfrageAktualisieren löst bei den Suchfeldern serverseitig ein Rematching aus,
  // `besterMatch` ist aber ein einmalig geladenes Prop. Ohne dieses Flag stünde
  // nach dem Speichern der alte Score als aktuell da.
  const [matchesVeraltet, setMatchesVeraltet] = useState(false)

  // AnfragenAnsicht rendert den Drawer ohne key (er bleibt für die Schliessen-Transition
  // gemountet). Wechselt die Auswahl, kommt ein neues `anfrage`-Prop in dieselbe
  // Instanz -- ohne Reset klebte der Bearbeiten-State der vorigen Anfrage. anfrageIdRef
  // erkennt zusätzlich einen Wechsel, während speichern() noch läuft.
  const anfrageIdRef = useRef(anfrage.id)
  useEffect(() => {
    anfrageIdRef.current = anfrage.id
    setBearbeiten(sofortBearbeiten)
    setEingaben(eingabenAus(anfrage))
    setStatus(anfrage.status)
    setFehler(null)
    setLaufend(false)
    setMatchesVeraltet(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anfrage.id])

  const id = anfrage.id
  const letzterKontakt = anfrage.letzter_kontakt
  const wert = puls(new Date(letzterKontakt))
  const tage = Math.floor((Date.now() - new Date(letzterKontakt).getTime()) / 86_400_000)

  // anfrageAktualisieren wirft bewusst (Milestone-Konvention) -- der Fehler landet
  // sichtbar in `fehler`, statt die Nutzerin ohne Grund im Bearbeiten-Modus zu lassen.
  async function speichern() {
    const zielId = id
    setLaufend(true)
    setFehler(null)
    try {
      await anfrageAktualisieren(zielId, {
        flaeche_min: eingaben.flaecheMin ? Number(eingaben.flaecheMin) : null,
        flaeche_max: eingaben.flaecheMax ? Number(eingaben.flaecheMax) : null,
        ort: eingaben.ort || null,
        budget_pro_m2: eingaben.budget ? Number(eingaben.budget) : null,
        bezug: eingaben.bezug || null,
        status,
      })
      if (anfrageIdRef.current === zielId) {
        setBearbeiten(false)
        setMatchesVeraltet(true)
      }
      onAenderungGespeichert?.()
    } catch (e) {
      if (anfrageIdRef.current === zielId) setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      if (anfrageIdRef.current === zielId) setLaufend(false)
    }
  }

  function abbrechen() {
    setEingaben(eingabenAus(anfrage))
    setStatus(anfrage.status)
    setFehler(null)
    setBearbeiten(false)
  }

  // Primäraktion rechts in der festen Leiste (Ruling R3).
  const fuss = bearbeiten ? (
    <>
      <Button onClick={abbrechen} disabled={laufend}>
        Abbrechen
      </Button>
      <Button variante="primaer" onClick={speichern} disabled={laufend}>
        {laufend ? "Wird gespeichert…" : "Speichern"}
      </Button>
    </>
  ) : (
    <Button icon={<Pencil className="size-4" aria-hidden />} onClick={() => setBearbeiten(true)}>
      Bearbeiten
    </Button>
  )

  return (
    <Drawer
      offen={offen}
      onSchliessen={onSchliessen}
      titel={anfrage.firma?.name ?? "Anfrage"}
      untertitel={`seit ${tage} Tagen`}
      chip={<StatusChip ton={anfrageStatusTon(anfrage.status)}>{ANFRAGE_STATUS_LABEL[anfrage.status]}</StatusChip>}
      fuss={fuss}
    >
      {/* Bearbeiten ersetzt die Eckdaten an derselben Stelle (wie bisher), damit ein
          Klick auf eine ?-Lücke direkt beim Formular landet. */}
      {bearbeiten ? (
        <AnfrageBearbeiten
          eingaben={eingaben}
          onAendern={(schluessel, neu) => setEingaben((alt) => ({ ...alt, [schluessel]: neu }))}
          status={status}
          onStatus={setStatus}
          laufend={laufend}
          fehler={fehler}
        />
      ) : (
        <AnfrageEckdaten anfrage={anfrage} pulsWert={wert} />
      )}
      {!bearbeiten && fehler && (
        <p role="alert" className="text-sm text-crit wrap-break-word">
          {fehler}
        </p>
      )}
      <AnfrageAngebote angebote={angebote} anfrageStatus={anfrage.status} onFertig={() => onAenderungGespeichert?.()} />
      {besterMatch && <BesterTreffer besterMatch={besterMatch} veraltet={matchesVeraltet} />}
      <Verlauf verlauf={verlauf} />
    </Drawer>
  )
}
