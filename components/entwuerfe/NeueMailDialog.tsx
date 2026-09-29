"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import { Button } from "@/components/ui/Button"
import { FormFeld, EINGABE_KLASSE } from "@/components/ui/FormFeld"
import { neueMail } from "@/app/actions/entwuerfe"

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
          <FormFeld label="An" htmlFor="neue-mail-an">
            <input
              id="neue-mail-an"
              type="email"
              required
              value={an}
              placeholder="empfaenger@beispiel.ch"
              onChange={(e) => setAn(e.target.value)}
              disabled={laedt}
              className={EINGABE_KLASSE}
            />
          </FormFeld>
          <FormFeld label="Betreff" htmlFor="neue-mail-betreff">
            <input
              id="neue-mail-betreff"
              required
              value={betreff}
              placeholder="Betreff"
              onChange={(e) => setBetreff(e.target.value)}
              disabled={laedt}
              className={EINGABE_KLASSE}
            />
          </FormFeld>
          <FormFeld label="Text" htmlFor="neue-mail-text">
            <textarea
              id="neue-mail-text"
              required
              value={body}
              placeholder="Mailtext"
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              disabled={laedt}
              className={EINGABE_KLASSE}
            />
          </FormFeld>
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
