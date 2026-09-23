"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { erstelleBrowserClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [passwort, setPasswort] = useState("")
  const [fehler, setFehler] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(false)

  async function anmelden(ereignis: FormEvent) {
    ereignis.preventDefault()
    // Re-Entrancy-Guard: ein async Handler wird nicht automatisch gegen
    // eine zweite Auslösung geschützt, bevor React den disabled-Zustand des
    // Buttons ins DOM übernommen hat (z. B. bei einem sehr beschäftigten
    // Hauptthread, Maus-Klick + Enter-Kombination oder programmatischem
    // form.requestSubmit()). Ohne diese Zeile könnten zwei parallele
    // signInWithPassword-Aufrufe losgehen.
    if (laedt) return
    setLaedt(true)
    setFehler(null)
    const supabase = erstelleBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: passwort })
    setLaedt(false)
    if (error) {
      setFehler("E-Mail oder Passwort stimmt nicht.")
      return
    }
    router.push("/")
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <form
        onSubmit={anmelden}
        className="flex w-full max-w-sm flex-col gap-3 rounded-card border border-line bg-surface p-6"
      >
        <h1 className="font-display text-xl font-bold text-ink">PULS</h1>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-line-2 px-3 py-2 text-sm text-ink"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Passwort"
          value={passwort}
          onChange={(e) => setPasswort(e.target.value)}
          className="rounded-lg border border-line-2 px-3 py-2 text-sm text-ink"
        />
        {fehler && <p className="text-sm text-crit">{fehler}</p>}
        <button
          type="submit"
          disabled={laedt}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-on-brand disabled:opacity-60"
        >
          {laedt ? "…" : "Anmelden"}
        </button>
      </form>
    </main>
  )
}
