"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { kontoAnlegen } from "@/app/actions/nutzer"
import { Button } from "@/components/ui/Button"
import { EINGABE_KLASSE, FormFeld } from "@/components/ui/FormFeld"

// Exportiert, damit NutzerAnsicht nach dem Öffnen des Panels hierhin fokussieren kann.
export const NAME_FELD_ID = "konto-name"

export function NeuesKontoFormular() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [darfNutzerAnlegen, setDarfNutzerAnlegen] = useState(false)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function absenden(ereignis: FormEvent) {
    ereignis.preventDefault()
    if (laedt) return
    setLaedt(true)
    setFehler(null)
    try {
      const { hinweis } = await kontoAnlegen({ name, email, darfNutzerAnlegen })
      if (hinweis) toast.warning(hinweis)
      else toast.success(`Einladung an ${email} gesendet`)
      setName("")
      setEmail("")
      setDarfNutzerAnlegen(false)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Konto konnte nicht angelegt werden.")
    } finally {
      setLaedt(false)
    }
  }

  return (
    <form onSubmit={absenden} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormFeld label="Name" htmlFor={NAME_FELD_ID}>
          <input id={NAME_FELD_ID} required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className={EINGABE_KLASSE} />
        </FormFeld>
        <FormFeld label="E-Mail" htmlFor="konto-email">
          <input id="konto-email" required type="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} className={EINGABE_KLASSE} />
        </FormFeld>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" checked={darfNutzerAnlegen} onChange={(e) => setDarfNutzerAnlegen(e.target.checked)} className="size-4 accent-brand" />
        darf ebenfalls Nutzer anlegen
      </label>
      {fehler && (
        <p role="alert" className="text-sm text-crit wrap-anywhere">
          {fehler}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" variante="primaer" disabled={laedt}>
          {laedt ? "…" : "Einladen"}
        </Button>
      </div>
    </form>
  )
}
