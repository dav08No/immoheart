"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { erstelleBrowserClient } from "@/lib/supabase/client"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [passwort, setPasswort] = useState("")
  const [passwortWiederholung, setPasswortWiederholung] = useState("")
  const [fehler, setFehler] = useState<string | null>(null)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(false)

  async function registrieren(ereignis: FormEvent) {
    ereignis.preventDefault()
    // Re-Entrancy-Guard: siehe login/page.tsx -- derselbe Grund gilt hier
    // ebenso für den signUp-Aufruf.
    if (laedt) return
    if (passwort !== passwortWiederholung) {
      setFehler("Die Passwörter stimmen nicht überein.")
      return
    }
    // Supabase Auth verlangt standardmässig mindestens 6 Zeichen -- Prüfung
    // vorab spart einen unnötigen Round-Trip bei offensichtlich zu kurzen
    // Passwörtern, ersetzt aber nicht Supabase's eigene serverseitige Prüfung.
    if (passwort.length < 6) {
      setFehler("Das Passwort muss mindestens 6 Zeichen lang sein.")
      return
    }
    setLaedt(true)
    setFehler(null)
    setHinweis(null)
    const supabase = erstelleBrowserClient()
    const { data, error } = await supabase.auth.signUp({ email, password: passwort })
    setLaedt(false)
    if (error) {
      setFehler(error.message)
      return
    }
    // Je nach Supabase-Projekteinstellung ("Confirm email" an/aus) liefert
    // signUp entweder direkt eine Session (dann sofort angemeldet) oder
    // data.session === null, weil erst eine Bestätigungs-E-Mail verschickt
    // wurde. Im zweiten Fall gibt es noch nichts, wohin man weiterleiten
    // könnte -- stattdessen den Hinweis anzeigen.
    if (data.session) {
      router.push("/")
      router.refresh()
      return
    }
    setHinweis("Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben, bevor du dich anmeldest.")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <form
        onSubmit={registrieren}
        className="flex w-full max-w-sm flex-col gap-3 rounded-card border border-line bg-surface p-6"
      >
        <h1 className="font-display text-xl font-bold text-ink">immoheart</h1>
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
          autoComplete="new-password"
          placeholder="Passwort"
          value={passwort}
          onChange={(e) => setPasswort(e.target.value)}
          className="rounded-lg border border-line-2 px-3 py-2 text-sm text-ink"
        />
        <input
          type="password"
          required
          autoComplete="new-password"
          placeholder="Passwort wiederholen"
          value={passwortWiederholung}
          onChange={(e) => setPasswortWiederholung(e.target.value)}
          className="rounded-lg border border-line-2 px-3 py-2 text-sm text-ink"
        />
        {fehler && <p className="text-sm text-crit">{fehler}</p>}
        {hinweis && <p className="text-sm text-ink">{hinweis}</p>}
        <button
          type="submit"
          disabled={laedt}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-on-brand disabled:opacity-60"
        >
          {laedt ? "…" : "Registrieren"}
        </button>
        <p className="text-sm text-ink-2">
          Schon ein Konto?{" "}
          <Link href="/login" className="font-medium text-brand">
            Anmelden
          </Link>
        </p>
      </form>
    </main>
  )
}
