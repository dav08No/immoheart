"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import { Button } from "@/components/ui/Button"
import { anhangLoeschen } from "@/app/actions/postfach"
import type { AnhangLink } from "@/lib/queries/postfach"

type Props = { anhang: AnhangLink | null; onSchliessen: () => void; onGeloescht: () => void }

export function AnhangLoeschenDialog({ anhang, onSchliessen, onGeloescht }: Props) {
  const [laeuft, setLaeuft] = useState(false)
  const sperre = useRef(false)

  async function loeschen() {
    if (!anhang || sperre.current) return
    sperre.current = true
    setLaeuft(true)
    try {
      const { fehler } = await anhangLoeschen(anhang.id)
      if (fehler) {
        toast.error(fehler)
        return
      }
      toast.success("Anhang gelöscht.")
      onGeloescht()
      onSchliessen()
    } catch {
      toast.error("Unerwarteter Fehler. Bitte Seite neu laden.")
    } finally {
      sperre.current = false
      setLaeuft(false)
    }
  }

  return (
    <Dialog open={anhang !== null} onOpenChange={(offen) => !offen && !laeuft && onSchliessen()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anhang löschen?</DialogTitle>
          <DialogDescription className="break-all">
            „{anhang?.dateiname}“ wird endgültig gelöscht. Bereits übernommene Objektfotos bleiben erhalten.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onSchliessen} disabled={laeuft}>
            Abbrechen
          </Button>
          <Button variante="primaer" disabled={laeuft} onClick={() => void loeschen()}>
            {laeuft ? "Wird gelöscht…" : "Löschen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
