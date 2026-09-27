"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { filterZuSuchparametern, type ObjektFilter } from "@/lib/objektsuche"

const VERZOEGERUNG_MS = 300

export type SetzeFilter = (teil: Partial<ObjektFilter>, verzoegert?: boolean) => void

// Der Filter lebt in der URL; die Seite liest ihn serverseitig neu. Bis die neue
// Antwort da ist, zeigt der Entwurf die Auswahl schon an -- und zwei schnelle Klicks
// bauen aufeinander auf statt auf dem alten Server-Stand.
export function useFilterUrl(filter: ObjektFilter): [ObjektFilter, SetzeFilter] {
  const router = useRouter()
  const [entwurf, setEntwurf] = useState(filter)
  const aktuell = useRef(filter)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Neuen Server-Stand (z.B. "Filter zurücksetzen", Zurück-Taste) nur übernehmen,
    // wenn keine eigene Änderung mehr aussteht -- sonst ginge sie verloren.
    if (timer.current !== null) return
    aktuell.current = filter
    setEntwurf(filter)
  }, [filter])

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current)
  }, [])

  const navigiere = useCallback(() => {
    timer.current = null
    router.replace(`/objekte?${filterZuSuchparametern(aktuell.current).toString()}`, { scroll: false })
  }, [router])

  const setze = useCallback<SetzeFilter>(
    (teil, verzoegert = false) => {
      aktuell.current = { ...aktuell.current, ...teil }
      setEntwurf(aktuell.current)
      if (timer.current !== null) clearTimeout(timer.current)
      if (verzoegert) timer.current = setTimeout(navigiere, VERZOEGERUNG_MS)
      else navigiere()
    },
    [navigiere]
  )

  return [entwurf, setze]
}
