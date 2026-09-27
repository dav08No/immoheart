"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import type { AktionAusfuehren } from "./typen"

// Eine Aktion zur Zeit je Detailansicht: der Ref sperrt sofort (auch vor dem nächsten
// Render), damit ein Doppelklick keine zweite, überlappende Server Action auslöst.
export function useAktion(): { laufend: string | null; ausfuehren: AktionAusfuehren } {
  const [laufend, setLaufend] = useState<string | null>(null)
  const sperre = useRef(false)

  const ausfuehren: AktionAusfuehren = async (schluessel, aktion, erfolg) => {
    if (sperre.current) return false
    sperre.current = true
    setLaufend(schluessel)
    try {
      const { fehler } = await aktion()
      if (fehler) {
        toast.error(fehler)
        return false
      }
      if (erfolg) toast.success(erfolg)
      return true
    } catch {
      toast.error("Unerwarteter Fehler. Bitte Seite neu laden.")
      return false
    } finally {
      sperre.current = false
      setLaufend(null)
    }
  }

  return { laufend, ausfuehren }
}
