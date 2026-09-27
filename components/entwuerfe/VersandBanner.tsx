"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { alsGesendetMarkieren, reservierungFreigeben } from "@/app/actions/entwuerfe"
import { istReservierungAbgelaufen } from "@/lib/entwurf-status"
import type { EntwurfMitBezug } from "@/lib/queries/nachrichten"

type Laufend = "freigeben" | "alsGesendet" | null

// Ausgelagert aus EntwurfEditor.tsx (N3-Review, Fund 1+2+3; Datei-Längenlimit): der
// gesamte "gerade reserviert"-Zustand eines Entwurfs -- entweder "Wird gesendet…" (noch
// keine zwei Minuten alt, siehe lib/entwurf-status.ts) oder der "Versand unklar"-Banner
// mit den beiden Ausweg-Aktionen. Nur gerendert, wenn entwurf.gesendet_am !== null.
export function VersandBanner({ entwurf }: { entwurf: EntwurfMitBezug }) {
  const router = useRouter()
  const [laufend, setLaufend] = useState<Laufend>(null)
  const [bestaetigung, setBestaetigung] = useState<Laufend>(null)

  // `jetzt` tickt alle 15s, damit die Anzeige nach Ablauf der zwei Minuten auch ohne
  // Neuauswahl/Reload automatisch vom "Wird gesendet…"-Hinweis auf den Banner wechselt.
  const [jetzt, setJetzt] = useState(() => new Date())
  useEffect(() => {
    const intervall = setInterval(() => setJetzt(new Date()), 15_000)
    return () => clearInterval(intervall)
  }, [])
  const abgelaufen = entwurf.gesendet_am !== null && istReservierungAbgelaufen(entwurf.gesendet_am, jetzt)

  async function freigeben() {
    setLaufend("freigeben")
    try {
      const { fehler } = await reservierungFreigeben(entwurf.id)
      if (fehler) toast.error(fehler)
      else {
        toast.success("Reservierung freigegeben")
        setBestaetigung(null)
      }
    } catch {
      toast.error("Unerwarteter Fehler. Bitte Seite neu laden.")
    } finally {
      setLaufend(null)
      router.refresh()
    }
  }

  async function alsGesendet() {
    setLaufend("alsGesendet")
    try {
      const { fehler } = await alsGesendetMarkieren(entwurf.id)
      if (fehler) toast.error(fehler)
      else {
        toast.success("Als gesendet markiert")
        setBestaetigung(null)
      }
    } catch {
      toast.error("Unerwarteter Fehler. Bitte Seite neu laden.")
    } finally {
      setLaufend(null)
      router.refresh()
    }
  }

  if (!abgelaufen) {
    return <div className="mb-3.5 rounded-lg border border-line-2 bg-surface-2 p-3 text-sm text-ink-2">Wird gesendet…</div>
  }

  return (
    <div className="mb-3.5 rounded-lg border border-warn bg-warn-bg p-3 text-sm text-warn">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex-1">Versand unklar – bitte im Gmail-Ordner „Gesendet” prüfen, bevor Sie erneut senden.</span>
      </div>
      {entwurf.versand_fehler && <p className="mt-2 text-xs text-warn">{entwurf.versand_fehler}</p>}
      {bestaetigung === null && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-dashed border-line-2 pt-3">
          <Button onClick={() => setBestaetigung("alsGesendet")} disabled={laufend !== null}>
            Mail ist im Gmail-Ordner „Gesendet” → Als gesendet markieren
          </Button>
          <Button onClick={() => setBestaetigung("freigeben")} disabled={laufend !== null}>
            Mail fehlt im Gmail-Ordner → Reservierung freigeben
          </Button>
        </div>
      )}
      {bestaetigung === "alsGesendet" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-line-2 pt-3 text-ink-2">
          Wirklich als gesendet markieren? Nur tun, wenn die Mail im Gmail-Ordner „Gesendet“ tatsächlich vorhanden ist.
          <Button onClick={alsGesendet} disabled={laufend !== null}>
            {laufend === "alsGesendet" ? "Wird markiert…" : "Ja, als gesendet markieren"}
          </Button>
          <Button onClick={() => setBestaetigung(null)} disabled={laufend !== null}>
            Abbrechen
          </Button>
        </div>
      )}
      {bestaetigung === "freigeben" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-line-2 pt-3 text-ink-2">
          Wirklich freigeben? Nur tun, wenn die Mail im Gmail-Ordner „Gesendet“ NICHT vorhanden ist.
          <Button onClick={freigeben} disabled={laufend !== null}>
            {laufend === "freigeben" ? "Wird freigegeben…" : "Ja, freigeben"}
          </Button>
          <Button onClick={() => setBestaetigung(null)} disabled={laufend !== null}>
            Abbrechen
          </Button>
        </div>
      )}
    </div>
  )
}
