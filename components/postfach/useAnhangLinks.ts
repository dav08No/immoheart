"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { anhangLinks } from "@/app/actions/postfach"
import type { AnhangLink } from "@/lib/queries/postfach"

export type AnhangLaden = { status: "laedt" } | { status: "fertig"; links: AnhangLink[] } | { status: "fehler"; text: string }

// Signierte URLs gelten 10 Minuten; ab 9 Minuten wird vor einem Klick neu geholt, damit
// ein lange offenes Detail keinen abgelaufenen Link öffnet.
const FRISCH_MS = 9 * 60_000

export function useAnhangLinks(nachrichtId: string, anzahl: number) {
  const [laden, setLaden] = useState<AnhangLaden>({ status: "laedt" })
  const geladenAm = useRef(0)
  const aktuell = useRef<AnhangLink[]>([])
  const aktiv = useRef(true)

  const neuLaden = useCallback(async (): Promise<AnhangLink[]> => {
    try {
      const ergebnis = await anhangLinks(nachrichtId)
      if (!aktiv.current) return []
      if (ergebnis.fehler) {
        setLaden({ status: "fehler", text: ergebnis.fehler })
        return []
      }
      geladenAm.current = Date.now()
      aktuell.current = ergebnis.links
      setLaden({ status: "fertig", links: ergebnis.links })
      return ergebnis.links
    } catch {
      if (aktiv.current) setLaden({ status: "fehler", text: "Anhänge konnten nicht geladen werden." })
      return []
    }
  }, [nachrichtId])

  useEffect(() => {
    aktiv.current = true
    if (anzahl > 0) void neuLaden()
    return () => {
      aktiv.current = false
    }
  }, [anzahl, neuLaden])

  // Liefert den Link zu einer Anhang-ID, bei Bedarf mit frisch signierten URLs.
  const frisch = useCallback(
    async (id: string): Promise<AnhangLink | null> => {
      const links = Date.now() - geladenAm.current < FRISCH_MS ? aktuell.current : await neuLaden()
      return links.find((l) => l.id === id) ?? null
    },
    [neuLaden]
  )

  const istVeraltet = useCallback(() => Date.now() - geladenAm.current >= FRISCH_MS, [])

  return { laden, neuLaden, frisch, istVeraltet }
}
