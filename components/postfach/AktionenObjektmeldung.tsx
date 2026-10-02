"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Abschnittstitel } from "@/components/ui/Abschnittstitel"
import { objektZuordnen } from "@/app/actions/eingang-aktionen"
import { meldungAus } from "@/lib/abschluss/postfach-aktionen"
import type { PostfachNachricht } from "@/lib/queries/postfach"
import { ObjektmeldungAktion } from "./ObjektmeldungAktion"
import { AUSWAHL_KLASSE, type AktionAusfuehren, type ObjektOption } from "./typen"

type Props = {
  nachricht: PostfachNachricht
  objekte: ObjektOption[]
  laufend: string | null
  ausfuehren: AktionAusfuehren
}

const AENDERUNG_TEXT = {
  nicht_verfuegbar: "Fläche nicht mehr verfügbar",
  wieder_verfuegbar: "Fläche wieder verfügbar",
  sonstige_aenderung: "Sonstige Änderung",
} as const

// Eigentümer meldet eine Änderung an einer bekannten Fläche (Spec §2). Beim Einlesen
// entstand nur der Dank-Entwurf; Statuswechsel und Absagen erst nach Klick und Bestätigung.
export function AktionenObjektmeldung({ nachricht, objekte, laufend, ausfuehren }: Props) {
  const [auswahl, setAuswahl] = useState("")
  const meldung = meldungAus(nachricht.erkannte_felder)
  const objekt = objekte.find((o) => o.id === nachricht.objekt_id)
  // Wie bei der automatischen Zuordnung: für vermietete Flächen erwarten wir keine Meldung.
  const waehlbar = objekte.filter((o) => o.status === "verfuegbar" || o.status === "reserviert")

  return (
    <section aria-label="Objektmeldung" className="flex flex-col gap-3">
      <Abschnittstitel>Meldung zu einem Objekt</Abschnittstitel>
      <div className="flex flex-col gap-1 rounded-lg border border-line p-3">
        <span className="text-xs text-ink-2">{AENDERUNG_TEXT[meldung.aenderung]}</span>
        <p className="wrap-break-word text-sm text-ink">{meldung.zusammenfassung || "Keine Zusammenfassung erkannt."}</p>
      </div>
      {nachricht.objekt_id ? (
        <>
          <Link
            href={`/admin/objekte?id=${nachricht.objekt_id}`}
            className="text-sm text-brand hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            Zugeordnet: {objekt?.label ?? "Objekt öffnen"}
          </Link>
          <ObjektmeldungAktion
            eingangId={nachricht.id}
            objektId={nachricht.objekt_id}
            titel={objekt?.label ?? "Objekt"}
            aenderung={meldung.aenderung}
          />
        </>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-ink-2">
            Kein Objekt erkannt · Objekt zuordnen
            <select
              value={auswahl}
              onChange={(e) => setAuswahl(e.target.value)}
              disabled={laufend !== null || waehlbar.length === 0}
              className={AUSWAHL_KLASSE}
            >
              <option value="" disabled>
                {waehlbar.length === 0 ? "Keine verfügbaren Objekte" : "Objekt wählen …"}
              </option>
              {waehlbar.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <Button
            variante="primaer"
            disabled={auswahl === "" || laufend !== null}
            onClick={() => void ausfuehren("zuordnen", () => objektZuordnen(nachricht.id, auswahl), "Objekt zugeordnet.")}
          >
            {laufend === "zuordnen" ? "Wird zugeordnet…" : "Zuordnen"}
          </Button>
        </div>
      )}
    </section>
  )
}
