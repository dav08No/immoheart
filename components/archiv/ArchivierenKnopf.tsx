"use client"

import { useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Archive } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import { Button } from "@/components/ui/Button"
import { EINGABE_KLASSE, FormFeld } from "@/components/ui/FormFeld"
import { anfrageArchivieren, objektArchivieren } from "@/app/actions/archiv"
import { GRUND_MAX } from "@/lib/archiv/grund"

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
      "Die Anfrage verschwindet aus Listen, Treffersuche und Website. Sie bleibt im Archiv und im Jahresrapport und kann dort wiederhergestellt werden. Offene Angebote werden ohne Absage erledigt.",
  },
}
const AKTION = { objekt: objektArchivieren, anfrage: anfrageArchivieren }

type Props = {
  art: Art
  id: string
  bezeichnung: string
  // Schliesst das Panel; die Seite lädt der Knopf selbst neu.
  onArchiviert: () => void
}

// Dezent, damit er nicht mit den Hauptaktionen des Panels konkurriert (Spec §1).
export function ArchivierenKnopf({ art, id, bezeichnung, onArchiviert }: Props) {
  const router = useRouter()
  const feldId = useId()
  const [offen, setOffen] = useState(false)
  const [grund, setGrund] = useState("")
  const [laufend, setLaufend] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  // Nach Erfolg schliesst das Panel; dessen Fokus-Rückgabe soll gewinnen, nicht die des Dialogs.
  const erfolgRef = useRef(false)
  const text = TEXTE[art]

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
      setOffen(false)
      onArchiviert()
      router.refresh()
    } catch {
      setFehler("Unerwarteter Fehler. Bitte Seite neu laden.")
    } finally {
      setLaufend(false)
    }
  }

  return (
    <>
      <Button variante="dezent" icon={<Archive className="size-4" aria-hidden />} aria-label={`Archivieren: ${bezeichnung}`} onClick={oeffnen}>
        Archivieren
      </Button>
      <Dialog open={offen} onOpenChange={(auf) => !auf && !laufend && setOffen(false)}>
        <DialogContent
          showCloseButton={!laufend}
          onCloseAutoFocus={(ereignis) => {
            if (!erfolgRef.current) return
            ereignis.preventDefault()
            erfolgRef.current = false
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
