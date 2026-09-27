"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import { Button } from "@/components/ui/Button"
import { neueMail } from "@/app/actions/entwuerfe"

const FELD = "rounded-lg border border-line-2 px-3 py-2 text-sm text-ink disabled:opacity-60"

// Grundsatz des Milestones: gesendet wird ausschliesslich aus dem
// EntwurfEditor (dort mit eigener Bestätigung). Dieser Dialog legt bewusst
// nur einen Entwurf an -- kein Direkt-Versand-Knopf hier.
export function NeueMailDialog({ offen, onOpenChange }: { offen: boolean; onOpenChange: (offen: boolean) => void }) {
  const router = useRouter()
  const [an, setAn] = useState("")
  const [betreff, setBetreff] = useState("")
  const [body, setBody] = useState("")
  const [laedt, setLaedt] = useState(false)

  async function anlegen(ereignis: FormEvent) {
    ereignis.preventDefault()
    setLaedt(true)
    try {
      const { id, fehler } = await neueMail({ an, betreff, body })
      if (fehler || !id) {
        toast.error(fehler ?? "Entwurf konnte nicht angelegt werden.")
        return
      }
      setAn("")
      setBetreff("")
      setBody("")
      onOpenChange(false)
      router.push(`/admin/entwuerfe?id=${id}`)
    } catch {
      toast.error("Unerwarteter Fehler. Bitte Seite neu laden.")
    } finally {
      setLaedt(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={offen} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={anlegen} className="flex flex-col gap-3">
          <DialogHeader>
            <DialogTitle>Neue Mail</DialogTitle>
            <DialogDescription>Legt einen Entwurf an, der erst nach Prüfung im Editor gesendet wird.</DialogDescription>
          </DialogHeader>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-2">An</span>
            <input
              type="email"
              required
              value={an}
              placeholder="empfaenger@beispiel.ch"
              onChange={(e) => setAn(e.target.value)}
              disabled={laedt}
              className={FELD}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-2">Betreff</span>
            <input
              required
              value={betreff}
              placeholder="Betreff"
              onChange={(e) => setBetreff(e.target.value)}
              disabled={laedt}
              className={FELD}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-2">Text</span>
            <textarea
              required
              value={body}
              placeholder="Mailtext"
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              disabled={laedt}
              className={FELD}
            />
          </label>
          <DialogFooter>
            <Button type="submit" variante="primaer" disabled={laedt}>
              {laedt ? "Wird angelegt…" : "Als Entwurf anlegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
