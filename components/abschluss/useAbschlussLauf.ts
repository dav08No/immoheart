"use client"

import { useEffect, useRef, useState } from "react"

export type AbschlussErgebnis = {
  fehler: string | null
  hinweise?: string[]
  fehlend?: number
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
  const rueckmeldungRef = useRef<HTMLDivElement>(null)
  const erfolgRef = useRef(false)

  useEffect(() => setFehlendAktuell(null), [fehlendeEntwuerfe])

  async function mitSperre(schritt: () => Promise<AbschlussErgebnis>, erfolgText: string): Promise<boolean> {
    setLaufend(true)
    setErfolg(null)
    try {
      const e = await schritt()
      setFehler(e.fehler)
      if (e.fehler) return false
      setErfolg(erfolgText)
      setHinweise(e.hinweise ?? [])
      setFehlendAktuell(e.fehlend ?? 0)
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
    rueckmeldungRef,
  }
}

export type AbschlussLauf = ReturnType<typeof useAbschlussLauf>
