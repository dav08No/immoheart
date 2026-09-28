"use client"

import { useEffect, useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/shadcn/button"
import { IMMOHEART_MAIL } from "@/lib/mailto"

type Kopierstatus = "bereit" | "kopiert" | "nicht_moeglich"

// Eigene Client-Insel für den Clipboard-Zugriff: von Suchauftrag (MailVariante)
// und Inserieren (InserierenAktion) gemeinsam genutzt, um die Kopier-Logik nicht
// doppelt zu pflegen.
export function AdresseKopieren() {
  const [status, setStatus] = useState<Kopierstatus>("bereit")

  // "Kopiert" nur kurz zeigen, danach kann erneut kopiert werden.
  useEffect(() => {
    if (status !== "kopiert") return
    const timer = setTimeout(() => setStatus("bereit"), 2500)
    return () => clearTimeout(timer)
  }, [status])

  async function kopieren() {
    // Ohne sicheren Kontext (http) oder bei verweigerter Berechtigung gibt es kein
    // Clipboard -- dann die Adresse zum Abschreiben/Markieren nennen.
    try {
      if (!navigator.clipboard) throw new Error("Kein Clipboard")
      await navigator.clipboard.writeText(IMMOHEART_MAIL)
      setStatus("kopiert")
    } catch {
      setStatus("nicht_moeglich")
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" onClick={() => void kopieren()}>
        {status === "kopiert" ? <Check aria-hidden /> : <Copy aria-hidden />}
        {status === "kopiert" ? "Kopiert" : "Adresse kopieren"}
      </Button>
      {/* Rückmeldung für Screenreader; sichtbar nur der Fallback-Hinweis. */}
      <p role="status" className="text-sm text-ink-3">
        {status === "kopiert" && <span className="sr-only">Adresse kopiert.</span>}
        {status === "nicht_moeglich" && "Kopieren ist hier nicht möglich. Bitte markieren Sie die Adresse oben."}
      </p>
    </div>
  )
}
