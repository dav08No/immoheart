"use client"

import { useEffect, useRef, useState } from "react"

export type AbschlussErgebnis = {
  fehler: string | null
  hinweise?: string[]
  fehlend?: number
  // fehlend zählt dann Entwürfe, deren KI-Text gerade nach der Antwort entsteht (Ruling R15).
  hintergrund?: boolean
}

// Gemeinsamer Ablauf für Treffer- und Objekt-Aktionen: Sperre während der Server Action,
// Rückmeldung (Fehler, Hinweise, fehlende Entwürfe) und Fokus nach dem Dialog.
export function useAbschlussLauf(fehlendeEntwuerfe: number, onFertig: () => void) {
  const [dialogOffen, setDialogOffen] = useState(false)
  const [laufend, setLaufend] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [hinweise, setHinweise] = useState<string[]>([])
  const [erfolg, setErfolg] = useState<string | null>(null)
  // Frischer Wert aus der Aktion, bis die neu geladenen Daten ihn ablösen.
  const [fehlendAktuell, setFehlendAktuell] = useState<number | null>(null)
  // Bleibt bis zur nächsten Aktion stehen: nach router.refresh zählt der Server dieselben
  // Platzhalter noch als fehlend, obwohl die KI im Hintergrund an ihnen arbeitet.
  const [hintergrund, setHintergrund] = useState(false)
  const rueckmeldungRef = useRef<HTMLDivElement>(null)
  const erfolgRef = useRef(false)

  useEffect(() => setFehlendAktuell(null), [fehlendeEntwuerfe])

  async function mitSperre(schritt: () => Promise<AbschlussErgebnis>, erfolgText: string): Promise<boolean> {
    setLaufend(true)
    // Alte Hinweise mit zurücksetzen, sonst stehen sie neben einem neuen Fehler.
    setErfolg(null)
    setHinweise([])
    setHintergrund(false)
    try {
      const e = await schritt()
      setFehler(e.fehler)
      if (e.fehler) return false
      setErfolg(erfolgText)
      setHinweise(e.hinweise ?? [])
      setFehlendAktuell(e.fehlend ?? 0)
      setHintergrund(e.hintergrund === true)
      onFertig()
      return true
    } catch {
      setFehler("Unerwarteter Fehler. Bitte Seite neu laden.")
      return false
    } finally {
      setLaufend(false)
    }
  }

  function oeffneDialog() {
    setFehler(null)
    setDialogOffen(true)
  }

  async function bestaetigen(schritt: () => Promise<AbschlussErgebnis>, erfolgText: string) {
    if (laufend) return
    erfolgRef.current = await mitSperre(schritt, erfolgText)
    setDialogOffen(false)
  }

  // Nach Erfolg kann der auslösende Knopf verschwunden sein -> Fokus auf die Rückmeldung.
  function fokusNachSchliessen(ereignis: Event) {
    if (!erfolgRef.current) return
    ereignis.preventDefault()
    erfolgRef.current = false
    rueckmeldungRef.current?.focus()
  }

  return {
    dialogOffen,
    schliesseDialog: () => setDialogOffen(false),
    oeffneDialog,
    bestaetigen,
    mitSperre,
    fokusNachSchliessen,
    laufend,
    fehler,
    hinweise,
    erfolg,
    fehlend: fehlendAktuell ?? fehlendeEntwuerfe,
    hintergrund,
    rueckmeldungRef,
  }
}

export type AbschlussLauf = ReturnType<typeof useAbschlussLauf>
