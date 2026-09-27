"use client"

// Gemeinsamer Client-Ablauf der öffentlichen Formulare ("Objekt anfragen", "Suchauftrag"):
// Zeit-Token (inkl. Erneuerung), Honeypot-Wert, Hydrierungs-Sperre, Fehler, Danke-Zustand
// und Fokusführung -- damit beide Formulare garantiert denselben Schutz haben.
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react"
import { zeitTokenHolen } from "@/app/actions/objektanfrage"
import type { ObjektAnfrageErgebnis } from "@/lib/objektanfrage-ergebnis"

const ALLGEMEINER_FEHLER = "Ihre Anfrage konnte gerade nicht gesendet werden. Bitte versuchen Sie es später erneut."

export type Schutzfelder = { webseite: string; zeitToken: string }

// Ein neues Token startet die Mindestzeit neu; scheitert der Abruf, bleibt das alte
// und die nächste Einsendung meldet erneut den Token-Fehler.
async function neuesToken(): Promise<string | null> {
  try {
    return await zeitTokenHolen()
  } catch {
    return null
  }
}

export function useWebsiteFormular(startToken: string) {
  const [zeitToken, setZeitToken] = useState(startToken)
  const [webseite, setWebseite] = useState("")
  const [fehler, setFehler] = useState<string | null>(null)
  const [feldFehler, setFeldFehler] = useState<Record<string, string>>({})
  const [gesendet, setGesendet] = useState(false)
  const [laeuft, starte] = useTransition()
  // Vor der Hydrierung (oder ohne JS) würde der Browser das Formular selbst als GET
  // abschicken -- Name und E-Mail landeten dann in der URL und in Server-Logs.
  const [bereit, setBereit] = useState(false)
  useEffect(() => setBereit(true), [])
  const fehlerRef = useRef<HTMLDivElement>(null)
  const dankeRef = useRef<HTMLDivElement>(null)

  // Nach dem Senden den Fokus auf die Rückmeldung setzen, sonst bleibt er auf
  // einem deaktivierten bzw. verschwundenen Knopf hängen.
  useEffect(() => {
    if (fehler) fehlerRef.current?.focus()
  }, [fehler])
  useEffect(() => {
    if (gesendet) dankeRef.current?.focus()
  }, [gesendet])
  // Konnte der Server beim Rendern kein Token erzeugen, jetzt eines nachholen.
  useEffect(() => {
    if (startToken) return
    void neuesToken().then((token) => {
      if (token) setZeitToken(token)
    })
  }, [startToken])

  function senden(e: FormEvent<HTMLFormElement>, aktion: (schutz: Schutzfelder) => Promise<ObjektAnfrageErgebnis>) {
    e.preventDefault()
    if (laeuft || gesendet) return
    setFehler(null)
    starte(async () => {
      try {
        const ergebnis = await aktion({ webseite, zeitToken })
        if (ergebnis.ok) {
          setGesendet(true)
          return
        }
        // Eingaben bleiben stehen; nur das Token wird für den nächsten Versuch ersetzt.
        if (ergebnis.tokenErneuern) {
          const token = await neuesToken()
          if (token) setZeitToken(token)
        }
        setFeldFehler(ergebnis.feldFehler ?? {})
        setFehler(ergebnis.fehler)
      } catch {
        // Netzwerk weg o.ä.: die Action selbst wirft nie, der Aufruf schon.
        setFeldFehler({})
        setFehler(ALLGEMEINER_FEHLER)
      }
    })
  }

  return { webseite, setWebseite, fehler, feldFehler, gesendet, laeuft, bereit, fehlerRef, dankeRef, senden }
}
