"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { anfrageZuordnen, feldUebernehmen } from "@/app/actions/eingang-aktionen"
import { UEBERNEHMBARE_FELDER } from "@/lib/eingang/anfrage-aus-eingang"
import type { ErkannteFelder } from "@/lib/ki/erkennung"
import type { PostfachNachricht } from "@/lib/queries/postfach"
import { AUSWAHL_KLASSE, FELD_LABELS, nutzungLabel, type AktionAusfuehren, type AnfrageOption } from "./typen"

type Props = {
  nachricht: PostfachNachricht
  anfragen: AnfrageOption[]
  laufend: string | null
  ausfuehren: AktionAusfuehren
}

export function AktionenAntwort({ nachricht, anfragen, laufend, ausfuehren }: Props) {
  const [auswahl, setAuswahl] = useState("")
  const felder = nachricht.erkannte_felder as ErkannteFelder | null
  const zugeordnet = anfragen.find((a) => a.id === nachricht.anfrage_id)
  const offene = anfragen.filter((a) => a.offen)
  // != null statt !== null: ältere/abweichende KI-Antworten können Schlüssel ganz weglassen.
  const neueAngaben = felder ? UEBERNEHMBARE_FELDER.filter((feld) => felder[feld] != null) : []

  return (
    <section aria-label="Antwort" className="mt-4 flex flex-col gap-3">
      <div className="border-b border-line pb-1.5 text-xs text-ink-3">Antwort auf eine Anfrage</div>
      {nachricht.anfrage_id ? (
        <Link
          href={`/admin/anfragen?id=${nachricht.anfrage_id}`}
          className="text-sm text-brand hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Zugeordnet: {zugeordnet?.label ?? "Anfrage öffnen"}
        </Link>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-ink-3">
            Keine Anfrage erkannt · Anfrage zuordnen
            <select
              value={auswahl}
              onChange={(e) => setAuswahl(e.target.value)}
              disabled={laufend !== null || offene.length === 0}
              className={AUSWAHL_KLASSE}
            >
              <option value="" disabled>
                {offene.length === 0 ? "Keine offenen Anfragen" : "Anfrage wählen …"}
              </option>
              {offene.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <Button
            variante="primaer"
            disabled={auswahl === "" || laufend !== null}
            onClick={() => void ausfuehren("zuordnen", () => anfrageZuordnen(nachricht.id, auswahl), "Anfrage zugeordnet.")}
          >
            {laufend === "zuordnen" ? "Wird zugeordnet…" : "Zuordnen"}
          </Button>
        </div>
      )}
      {felder && neueAngaben.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-xs text-ink-3">Neue Angaben in dieser Mail</div>
          {neueAngaben.map((feld) => {
            const wert = feld === "nutzung" ? nutzungLabel(felder.nutzung) : String(felder[feld])
            return (
              <div key={feld} className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5">
                <span className="w-28 flex-none text-xs text-ink-3">{FELD_LABELS[feld]}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{wert}</span>
                <Button
                  disabled={!nachricht.anfrage_id || laufend !== null}
                  aria-label={`${FELD_LABELS[feld]} in die Anfrage übernehmen`}
                  onClick={() =>
                    void ausfuehren(`feld-${feld}`, () => feldUebernehmen(nachricht.id, feld), `${FELD_LABELS[feld]} übernommen.`)
                  }
                >
                  {laufend === `feld-${feld}` ? "…" : "Übernehmen"}
                </Button>
              </div>
            )
          })}
          {!nachricht.anfrage_id && <p className="text-xs text-ink-3">Zum Übernehmen zuerst eine Anfrage zuordnen.</p>}
        </div>
      )}
    </section>
  )
}
