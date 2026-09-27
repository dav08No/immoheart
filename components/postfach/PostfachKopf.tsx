"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { mailAbrufen, verarbeiteNaechste } from "@/app/actions/eingang"
import { abrufAnzeige } from "@/lib/postfach"
import { formatUhrzeit, formatZeitpunkt } from "@/lib/format"
import type { AbrufStatus } from "@/lib/queries/eingang"

// Obergrenze pro Klick: jede Einordnung kann bis ~60 s dauern; der Rest wartet auf den
// nächsten Klick statt die Seite minutenlang zu blockieren.
const MAX_EINORDNUNGEN = 10

function zeitpunkt(iso: string): string {
  const datum = new Date(iso)
  const heute = formatZeitpunkt(new Date()) === formatZeitpunkt(datum)
  return heute ? formatUhrzeit(datum) : `${formatZeitpunkt(datum)} ${formatUhrzeit(datum)}`
}

export function PostfachKopf({ abrufStatus }: { abrufStatus: AbrufStatus }) {
  const router = useRouter()
  const [fortschritt, setFortschritt] = useState<string | null>(null)
  const sperre = useRef(false)
  const { erfolgAm, fehler } = abrufAnzeige(abrufStatus)

  async function jetztAbrufen() {
    if (sperre.current) return
    sperre.current = true
    setFortschritt("Mails werden abgerufen…")
    let eingeordnet = 0
    try {
      const abruf = await mailAbrufen()
      if (abruf.fehler) toast.error(abruf.fehler)
      // Auch nach einem Abruf-Fehler weiter einordnen: ältere, noch offene Mails
      // sollen trotzdem verarbeitet werden.
      for (let i = 0; i < MAX_EINORDNUNGEN; i++) {
        setFortschritt(eingeordnet === 0 ? "Wird eingeordnet…" : `${eingeordnet} eingeordnet…`)
        const schritt = await verarbeiteNaechste()
        if (!schritt.verarbeitet) break
        eingeordnet += 1
        if (schritt.fehler) toast.error(`Einordnung fehlgeschlagen: ${schritt.fehler}`)
      }
      toast.success(
        `${abruf.neu} neue Mail${abruf.neu === 1 ? "" : "s"}, ${eingeordnet} eingeordnet.`
      )
    } catch {
      toast.error("Unerwarteter Fehler beim Abrufen. Bitte Seite neu laden.")
    } finally {
      sperre.current = false
      setFortschritt(null)
      router.refresh()
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface px-4 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-xs">
        <span className="text-ink-2">
          {erfolgAm ? `Zuletzt abgerufen ${zeitpunkt(erfolgAm)}` : "Noch nie abgerufen"}
        </span>
        {fehler && (
          <span className="text-crit" role="status">
            Abruf fehlgeschlagen {zeitpunkt(fehler.am)}: {fehler.text}
          </span>
        )}
      </div>
      {fortschritt && (
        <span className="text-xs text-ink-3" aria-live="polite">
          {fortschritt}
        </span>
      )}
      <Button variante="primaer" onClick={() => void jetztAbrufen()} disabled={fortschritt !== null}>
        {fortschritt ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="size-4" aria-hidden />
        )}
        Jetzt abrufen
      </Button>
    </div>
  )
}
