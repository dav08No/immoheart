"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { erstelleBrowserClient } from "@/lib/supabase/client"
import { passwortFehlerText } from "@/lib/passwort-fehler"

const MINDESTLAENGE = 8

export function PasswortSetzenFormular({ email }: { email: string }) {
  const router = useRouter()
  const [passwort, setPasswort] = useState("")
  const [wiederholung, setWiederholung] = useState("")
  const [fehler, setFehler] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(false)

  async function speichern(ereignis: FormEvent) {
    ereignis.preventDefault()
    if (laedt) return
    if (passwort.length < MINDESTLAENGE) return setFehler(`Mindestens ${MINDESTLAENGE} Zeichen.`)
    if (passwort !== wiederholung) return setFehler("Die Passwörter stimmen nicht überein.")
    setLaedt(true)
    setFehler(null)
    const supabase = erstelleBrowserClient()
    const { error } = await supabase.auth.updateUser({ password: passwort })
    setLaedt(false)
    if (error) return setFehler(passwortFehlerText(error.code))
    router.push("/admin")
    router.refresh()
  }

  return (
    <form onSubmit={speichern} className="flex w-full max-w-sm flex-col gap-3 rounded-card border border-line bg-surface p-6">
      <h1 className="font-display text-xl font-bold text-ink">Passwort festlegen</h1>
      <p className="text-sm text-ink-2">{email}</p>
      <input
        type="password"
        required
        autoComplete="new-password"
        placeholder="Neues Passwort"
        value={passwort}
        onChange={(e) => setPasswort(e.target.value)}
        className="rounded-lg border border-line-2 px-3 py-2 text-sm text-ink"
      />
      <input
        type="password"
        required
        autoComplete="new-password"
        placeholder="Passwort wiederholen"
        value={wiederholung}
        onChange={(e) => setWiederholung(e.target.value)}
        className="rounded-lg border border-line-2 px-3 py-2 text-sm text-ink"
      />
      {fehler && <p className="text-sm text-crit">{fehler}</p>}
      <button type="submit" disabled={laedt} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-on-brand disabled:opacity-60">
        {laedt ? "…" : "Passwort speichern"}
      </button>
    </form>
  )
}
