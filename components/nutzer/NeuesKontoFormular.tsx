"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { kontoAnlegen } from "@/app/actions/nutzer"

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
    <form onSubmit={absenden} className="flex w-full flex-col gap-3 rounded-card border border-line bg-surface p-4 lg:w-80">
      <h2 className="font-display text-base font-bold text-ink">Neues Konto</h2>
      <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-line-2 px-3 py-2 text-sm text-ink" />
      <input required type="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border border-line-2 px-3 py-2 text-sm text-ink" />
      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" checked={darfNutzerAnlegen} onChange={(e) => setDarfNutzerAnlegen(e.target.checked)} />
        darf ebenfalls Nutzer anlegen
      </label>
      {fehler && <p className="text-sm text-crit">{fehler}</p>}
      <button type="submit" disabled={laedt} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-on-brand disabled:opacity-60">
        {laedt ? "…" : "Einladen"}
      </button>
    </form>
  )
}
