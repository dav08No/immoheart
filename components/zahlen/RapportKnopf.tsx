"use client"

import { useState } from "react"
import { FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import { Button } from "@/components/ui/Button"
import { rapportZeitraum } from "@/lib/rapport/zeitraum"

const ERSATZ_NAME = "immoheart-rapport.xlsx"

// Dateiname aus Content-Disposition; der Server baut ihn aus dem Zeitraum.
export function dateinameAus(kopf: string | null): string {
  const treffer = kopf?.match(/filename="([^"]+)"/)
  return treffer?.[1] ?? ERSATZ_NAME
}

async function fehlerAus(antwort: Response): Promise<string> {
  const daten: unknown = await antwort.json().catch(() => null)
  const fehler = typeof daten === "object" && daten !== null ? (daten as Record<string, unknown>).fehler : null
  return typeof fehler === "string" ? fehler : "Rapport konnte nicht erstellt werden."
}

// Blob plus temporärer Link: so lädt der Browser die Datei, ohne die Seite zu verlassen.
function herunterladen(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  // Verzögert freigeben: manche Browser starten den Download erst nach dem Klick-Ereignis.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Hauptaktion im Seitenkopf "Zahlen" (Spec §2 Ablauf): Dialog mit Zeitraum, dann Erstellen.
export function RapportKnopf({ mobil = false }: { mobil?: boolean }) {
  const [offen, setOffen] = useState(false)
  const [laufend, setLaufend] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  // Erst beim Öffnen berechnet: kein Datum im Server-HTML, also hydrationssicher.
  const [zeitraum, setZeitraum] = useState<string | null>(null)

  function oeffnen() {
    setZeitraum(rapportZeitraum(new Date()).label)
    setFehler(null)
    setOffen(true)
  }

  async function erstellen() {
    setLaufend(true)
    setFehler(null)
    try {
      const antwort = await fetch("/api/rapport", { method: "POST" })
      if (!antwort.ok) {
        setFehler(await fehlerAus(antwort))
        return
      }
      herunterladen(await antwort.blob(), dateinameAus(antwort.headers.get("content-disposition")))
      setOffen(false)
      toast.success("Jahresrapport erstellt")
    } catch {
      setFehler("Keine Verbindung. Bitte erneut versuchen.")
    } finally {
      setLaufend(false)
    }
  }

  const icon = <FileSpreadsheet className="size-4" aria-hidden />
  return (
    <>
      {mobil ? (
        <Button variante="primaer" className="size-10 px-0" aria-label="Jahresrapport erstellen" icon={icon} onClick={oeffnen} />
      ) : (
        <Button variante="primaer" icon={icon} onClick={oeffnen}>
          Jahresrapport erstellen
        </Button>
      )}
      <Dialog open={offen} onOpenChange={(auf) => !auf && !laufend && setOffen(false)}>
        <DialogContent showCloseButton={!laufend}>
          <DialogHeader>
            <DialogTitle>Jahresrapport erstellen</DialogTitle>
            <DialogDescription className="text-ink-2 wrap-break-word">
              Zeitraum: {zeitraum} (12 Monate bis heute)
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-ink-2 wrap-break-word">
            Die Datei enthält Kennzahlen, Diagramme, eine KI-Zusammenfassung und alle Daten des Zeitraums, inkl. archivierter
            Einträge.
          </p>
          {laufend && (
            <p role="status" className="text-sm text-ink-2">
              Rapport wird erstellt… (bis 1 Minute)
            </p>
          )}
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
            <Button variante="primaer" onClick={erstellen} disabled={laufend}>
              {laufend ? "Wird erstellt…" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
