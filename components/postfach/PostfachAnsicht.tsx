"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PostfachKopf } from "./PostfachKopf"
import { PostfachFilter } from "./PostfachFilter"
import { NachrichtenListe } from "./NachrichtenListe"
import { EingangDetail } from "./EingangDetail"
import { GesendetDetail } from "./GesendetDetail"
import { alsGelesenMarkieren } from "@/app/actions/eingang-aktionen"
import { filtereNachrichten, istUngelesen, zaehleChips, type KategorieChip, type PostfachFilter as Filter } from "@/lib/postfach"
import type { PostfachNachricht } from "@/lib/queries/postfach"
import type { AbrufStatus } from "@/lib/queries/eingang"
import type { AnfrageOption, EntwurfVerweis, ObjektOption } from "./typen"

type Props = {
  nachrichten: PostfachNachricht[]
  entwuerfe: EntwurfVerweis[]
  abrufStatus: AbrufStatus
  anfragen: AnfrageOption[]
  objekte: ObjektOption[]
}

export function PostfachAnsicht({ nachrichten, entwuerfe, abrufStatus, anfragen, objekte }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>("alle")
  const [chip, setChip] = useState<KategorieChip | null>(null)
  const [ausgewaehlteId, setAusgewaehlteId] = useState<string | null>(nachrichten[0]?.id ?? null)
  // IDs, für die "gelesen" schon angestossen wurde -- verhindert Doppelaufrufe, solange
  // die Seite die aktualisierte Zeile noch nicht zurückgeliefert hat.
  const markiert = useRef(new Set<string>())

  const sichtbar = filtereNachrichten(nachrichten, filter, chip)
  const ausgewaehlt = nachrichten.find((n) => n.id === ausgewaehlteId) ?? null

  // Nur eine aktive Auswahl markiert als gelesen -- die beim Laden vorausgewählte neueste
  // Mail bleibt ungelesen, sonst verschwände sie unbemerkt aus den "neuen".
  function auswaehlen(id: string) {
    setAusgewaehlteId(id)
    const nachricht = nachrichten.find((n) => n.id === id)
    if (!nachricht || !istUngelesen(nachricht) || markiert.current.has(id)) return
    markiert.current.add(id)
    alsGelesenMarkieren(id)
      .then(({ fehler }) => {
        if (fehler) markiert.current.delete(id)
      })
      .catch(() => {
        // Nur Komfort-Status: kein Toast, beim nächsten Öffnen wird es erneut versucht.
        markiert.current.delete(id)
      })
  }

  function filterWechseln(neu: Filter) {
    setFilter(neu)
    // Gesendete Mails haben keine Kategorie -- ein aktiver Chip leerte sonst die Liste.
    if (neu === "gesendet") setChip(null)
  }

  function gesendeteAuswaehlen(id: string) {
    setFilter("alle")
    setChip(null)
    auswaehlen(id)
  }

  // Zuordnung primär über antwort_auf (eindeutig); typ+an nur als Fallback für Altdaten
  // ohne antwort_auf. Beide Quellen sind nach created_at absteigend sortiert, .find()
  // trifft also jeweils den jüngsten Eintrag.
  function rueckfrageOeffnen(eingang: PostfachNachricht) {
    const gesendet = nachrichten.find((n) => n.richtung === "gesendet" && n.antwort_auf === eingang.id)
    if (gesendet) return gesendeteAuswaehlen(gesendet.id)
    const entwurf = entwuerfe.find((r) => r.antwort_auf === eingang.id)
    if (entwurf) return router.push(`/admin/entwuerfe?id=${entwurf.id}`)
    const altGesendet = nachrichten.find((n) => n.richtung === "gesendet" && n.typ === "rueckfrage" && n.an === eingang.von)
    if (altGesendet) return gesendeteAuswaehlen(altGesendet.id)
    const altEntwurf = entwuerfe.find((r) => r.typ === "rueckfrage" && r.an === eingang.von)
    if (altEntwurf) return router.push(`/admin/entwuerfe?id=${altEntwurf.id}`)
    toast.info("Keine Rückfrage vorhanden.")
  }

  return (
    <div className="flex flex-col gap-4">
      <PostfachKopf abrufStatus={abrufStatus} />
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="rounded-card border border-line bg-surface">
          <PostfachFilter
            filter={filter}
            chip={chip}
            zaehler={zaehleChips(nachrichten, filter)}
            onFilter={filterWechseln}
            onChip={setChip}
          />
          <NachrichtenListe nachrichten={sichtbar} ausgewaehlteId={ausgewaehlteId} onAuswahl={auswaehlen} />
        </div>
        <div className="rounded-card border border-line bg-surface">
          {!ausgewaehlt && <p className="p-10 text-center text-sm text-ink-3">Nachricht wählen.</p>}
          {ausgewaehlt?.richtung === "eingang" && (
            <EingangDetail
              key={ausgewaehlt.id}
              nachricht={ausgewaehlt}
              entwuerfe={entwuerfe}
              anfragen={anfragen}
              objekte={objekte}
              onRueckfrageOeffnen={() => rueckfrageOeffnen(ausgewaehlt)}
            />
          )}
          {ausgewaehlt?.richtung === "gesendet" && <GesendetDetail nachricht={ausgewaehlt} />}
        </div>
      </div>
    </div>
  )
}
