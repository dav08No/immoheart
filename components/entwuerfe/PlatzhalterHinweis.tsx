"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { abschlussEntwuerfeNachholen } from "@/app/actions/abschluss"

// Abschluss-Entwurf, dessen KI-Text beim Anlegen fehlte (Spec §2 KI-Ausfall). Nachholen
// füllt nur leere Platzhalter des Objekts; ohne Objekt bleibt nur Selbstschreiben oder Löschen.
export function PlatzhalterHinweis({ objektId }: { objektId: string | null }) {
  const router = useRouter()
  const [laufend, setLaufend] = useState(false)

  async function nachholen() {
    if (!objektId || laufend) return
    setLaufend(true)
    try {
      const e = await abschlussEntwuerfeNachholen(objektId)
      if (e.fehler) toast.error(e.fehler)
      else if ((e.fehlend ?? 0) > 0) toast.warning("KI-Text konnte noch nicht erzeugt werden. Bitte später erneut versuchen.")
      else toast.success("Entwürfe erneut erzeugt")
      for (const h of e.hinweise ?? []) toast.info(h)
    } catch {
      toast.error("Unerwarteter Fehler. Bitte Seite neu laden.")
    } finally {
      setLaufend(false)
      router.refresh()
    }
  }

  return (
    <div role="note" className="flex flex-col gap-2 rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
      <p className="wrap-break-word">
        Der KI-Text für diesen Entwurf fehlt noch. Sie können ihn erneut erzeugen lassen, selbst schreiben oder den
        Entwurf löschen.
      </p>
      {objektId && (
        <div className="flex justify-end">
          <Button variante="primaer" disabled={laufend} onClick={() => void nachholen()}>
            {laufend ? "Wird erzeugt…" : "Entwürfe erneut erzeugen"}
          </Button>
        </div>
      )}
    </div>
  )
}
