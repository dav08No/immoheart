"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { nameAendern } from "@/app/actions/profil"
import { erstelleBrowserClient } from "@/lib/supabase/client"

const MINDESTLAENGE = 8
const FELD = "rounded-lg border border-line-2 px-3 py-2 text-sm text-ink"
const KNOPF = "rounded-lg bg-brand px-3 py-2 text-sm font-medium text-on-brand disabled:opacity-60"

export function ProfilFormular({ name: startName, email }: { name: string; email: string }) {
  const [name, setName] = useState(startName)
  const [passwort, setPasswort] = useState("")
  const [wiederholung, setWiederholung] = useState("")
  const [laedt, setLaedt] = useState<"name" | "passwort" | null>(null)

  async function nameSpeichern(ereignis: FormEvent) {
    ereignis.preventDefault()
    setLaedt("name")
    try {
      await nameAendern(name)
      toast.success("Name gespeichert")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Name konnte nicht gespeichert werden")
    } finally {
      setLaedt(null)
    }
  }

  async function passwortSpeichern(ereignis: FormEvent) {
    ereignis.preventDefault()
    if (passwort.length < MINDESTLAENGE) return void toast.error(`Mindestens ${MINDESTLAENGE} Zeichen.`)
    if (passwort !== wiederholung) return void toast.error("Die Passwörter stimmen nicht überein.")
    setLaedt("passwort")
    const { error } = await erstelleBrowserClient().auth.updateUser({ password: passwort })
    setLaedt(null)
    if (error) return void toast.error("Passwort konnte nicht gespeichert werden.")
    setPasswort("")
    setWiederholung("")
    toast.success("Passwort geändert")
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <form onSubmit={nameSpeichern} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
        <h2 className="font-display text-base font-bold text-ink">Profil</h2>
        <p className="text-sm text-ink-2">{email}</p>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={FELD} />
        <button type="submit" disabled={laedt !== null} className={KNOPF}>{laedt === "name" ? "…" : "Name speichern"}</button>
      </form>
      <form onSubmit={passwortSpeichern} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
        <h2 className="font-display text-base font-bold text-ink">Passwort ändern</h2>
        <input type="password" autoComplete="new-password" placeholder="Neues Passwort" value={passwort} onChange={(e) => setPasswort(e.target.value)} className={FELD} />
        <input type="password" autoComplete="new-password" placeholder="Wiederholen" value={wiederholung} onChange={(e) => setWiederholung(e.target.value)} className={FELD} />
        <button type="submit" disabled={laedt !== null} className={KNOPF}>{laedt === "passwort" ? "…" : "Passwort ändern"}</button>
      </form>
    </div>
  )
}
