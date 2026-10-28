"use client"

import { useEffect, useId, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { Archive } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import { Button } from "@/components/ui/Button"
import { EINGABE_KLASSE, FormFeld } from "@/components/ui/FormFeld"
import { anfrageArchivieren, objektArchivieren } from "@/app/actions/archiv"
import { GRUND_MAX } from "@/lib/archiv/grund"
import { nachlaufPlanen } from "@/lib/ui/nachlauf"

type Art = "objekt" | "anfrage"

const TEXTE: Record<Art, { frage: string; folgen: string }> = {
  objekt: {
    frage: "Objekt archivieren?",
    folgen:
      "Das Objekt verschwindet aus Listen, Treffersuche und Website. Es bleibt im Archiv und im Jahresrapport und kann dort wiederhergestellt werden.",
  },
  anfrage: {
    frage: "Anfrage archivieren?",
    folgen:
      "Die Anfrage verschwindet aus Listen und Treffersuche. Sie bleibt im Archiv und im Jahresrapport und kann dort wiederhergestellt werden. Offene Angebote werden ohne Absage erledigt.",
  },
}
const AKTION = { objekt: objektArchivieren, anfrage: anfrageArchivieren }
// Ausblende-Animation des Dialogs dauert 200 ms; danach spätestens das Panel schliessen.
const NACHLAUF_MS = 400

type Props = {
  art: Art
  id: string
  bezeichnung: string
  // Während einer anderen Aktion im selben Panel gesperrt.
  gesperrt?: boolean
  // Schliesst das Panel und lädt die Seite neu (Aufgabe des Aufrufers, damit nur einmal).
  onArchiviert: () => void
}

// Dezent, damit er nicht mit den Hauptaktionen des Panels konkurriert (Spec §1).
export function ArchivierenKnopf({ art, id, bezeichnung, gesperrt = false, onArchiviert }: Props) {
  const feldId = useId()
  const [offen, setOffen] = useState(false)
  const [grund, setGrund] = useState("")
  const [laufend, setLaufend] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  // Nach Erfolg schliesst das Panel; dessen Fokus-Rückgabe soll gewinnen, nicht die des Dialogs.
  const erfolgRef = useRef(false)
  // onArchiviert erst nach dem Dialog: es entfernt den Teilbaum, in dem der Dialog lebt.
  const nachlaufRef = useRef<(() => void) | null>(null)
  const text = TEXTE[art]

  // Unmount mitten im Ablauf: ausstehendes Schliessen/Neuladen trotzdem ausführen.
  useEffect(() => {
    const nachlauf = nachlaufRef
    return () => nachlauf.current?.()
  }, [])

  function oeffnen() {
    setGrund("")
    setFehler(null)
    setOffen(true)
  }

  async function bestaetigen() {
    if (laufend) return
    setLaufend(true)
    setFehler(null)
    try {
      const e = await AKTION[art](id, grund)
      if (e.fehler) {
        setFehler(e.fehler)
        return
      }
      erfolgRef.current = true
      nachlaufRef.current = nachlaufPlanen(() => {
        nachlaufRef.current = null
        onArchiviert()
      }, NACHLAUF_MS)
      // Dialog zu und Sperre weg, committet bevor Refresh oder Panel den Baum umbauen.
      flushSync(() => {
        setOffen(false)
        setLaufend(false)
      })
    } catch {
      setFehler("Unerwarteter Fehler. Bitte Seite neu laden.")
    } finally {
      setLaufend(false)
    }
  }

  return (
    <>
      <Button variante="dezent" icon={<Archive className="size-4" aria-hidden />} aria-label={`Archivieren: ${bezeichnung}`} disabled={gesperrt} onClick={oeffnen}>
        Archivieren
      </Button>
      <Dialog open={offen} onOpenChange={(auf) => !auf && !laufend && setOffen(false)}>
        <DialogContent
          showCloseButton={!laufend}
          onCloseAutoFocus={(ereignis) => {
            if (!erfolgRef.current) return
            ereignis.preventDefault()
            erfolgRef.current = false
            nachlaufRef.current?.()
          }}
        >
          <DialogHeader>
            <DialogTitle>{text.frage}</DialogTitle>
            <DialogDescription className="text-ink-2 wrap-break-word">{text.folgen}</DialogDescription>
          </DialogHeader>
          <FormFeld label="Grund (optional)" htmlFor={feldId} hinweis={`Höchstens ${GRUND_MAX} Zeichen.`}>
            <input
              id={feldId}
              className={EINGABE_KLASSE}
              value={grund}
              maxLength={GRUND_MAX}
              disabled={laufend}
              aria-describedby={`${feldId}-hinweis`}
              onChange={(e) => setGrund(e.target.value)}
            />
          </FormFeld>
          {fehler && (
            <p role="alert" className="text-sm text-crit wrap-break-word">
              {fehler}
            </p>
          )}
          {/* Primäraktion rechts (Ruling R3); auf dem Handy dank flex-col-reverse oben. */}
          <DialogFooter>
            <Button onClick={() => setOffen(false)} disabled={laufend}>
              Abbrechen
            </Button>
            <Button variante="primaer" onClick={bestaetigen} disabled={laufend}>
              {laufend ? "Wird archiviert…" : "Archivieren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
