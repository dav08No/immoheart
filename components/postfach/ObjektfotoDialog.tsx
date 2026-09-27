"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import { Button } from "@/components/ui/Button"
import { alsObjektfotoUebernehmen } from "@/app/actions/fotos"
import type { AnhangLink } from "@/lib/queries/postfach"
import { AUSWAHL_KLASSE, type ObjektOption } from "./typen"

type Props = {
  anhang: AnhangLink | null
  objekte: ObjektOption[]
  vorauswahl: string | null
  onSchliessen: () => void
}

export function ObjektfotoDialog({ anhang, objekte, vorauswahl, onSchliessen }: Props) {
  return (
    <Dialog open={anhang !== null} onOpenChange={(offen) => !offen && onSchliessen()}>
      <DialogContent>
        {/* key: jede Öffnung startet mit der Vorauswahl statt der letzten Auswahl. */}
        {anhang && (
          <Inhalt key={anhang.id} anhang={anhang} objekte={objekte} vorauswahl={vorauswahl} onSchliessen={onSchliessen} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Inhalt({ anhang, objekte, vorauswahl, onSchliessen }: Props & { anhang: AnhangLink }) {
  const router = useRouter()
  // Ein inzwischen gelöschtes, verknüpftes Objekt steht nicht mehr in der Liste.
  const [auswahl, setAuswahl] = useState(objekte.some((o) => o.id === vorauswahl) ? (vorauswahl ?? "") : "")
  const [laeuft, setLaeuft] = useState(false)
  // Sperrt sofort (vor dem nächsten Render) gegen Doppelklick.
  const sperre = useRef(false)

  async function uebernehmen() {
    if (sperre.current || auswahl === "") return
    sperre.current = true
    setLaeuft(true)
    try {
      const { fehler } = await alsObjektfotoUebernehmen(anhang.id, auswahl)
      if (fehler) {
        toast.error(fehler)
        return
      }
      toast.success("Foto zum Objekt hinzugefügt.", {
        action: { label: "Objekt öffnen", onClick: () => router.push(`/admin/objekte?id=${auswahl}`) },
      })
      onSchliessen()
    } catch {
      toast.error("Unerwarteter Fehler. Bitte Seite neu laden.")
    } finally {
      sperre.current = false
      setLaeuft(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Als Objektfoto übernehmen</DialogTitle>
        <DialogDescription className="truncate">{anhang.dateiname}</DialogDescription>
      </DialogHeader>
      <label className="flex flex-col gap-1 text-xs text-ink-3">
        Objekt
        <select
          value={auswahl}
          onChange={(e) => setAuswahl(e.target.value)}
          disabled={laeuft || objekte.length === 0}
          className={AUSWAHL_KLASSE}
        >
          <option value="" disabled>
            {objekte.length === 0 ? "Noch keine Objekte angelegt" : "Objekt wählen …"}
          </option>
          {objekte.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <DialogFooter>
        <Button onClick={onSchliessen} disabled={laeuft}>
          Abbrechen
        </Button>
        <Button variante="primaer" disabled={auswahl === "" || laeuft} onClick={() => void uebernehmen()}>
          {laeuft ? "Wird übernommen…" : "Übernehmen"}
        </Button>
      </DialogFooter>
    </>
  )
}
