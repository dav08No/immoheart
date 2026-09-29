"use client"

import { Suspense, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { erstelleBrowserClient } from "@/lib/supabase/client"
import { loginHinweis } from "@/lib/routen"
import { AnmeldeRahmen, AUTH_LINK_KLASSE } from "@/components/auth/AnmeldeRahmen"
import { Button } from "@/components/ui/Button"
import { EINGABE_KLASSE, FormFeld } from "@/components/ui/FormFeld"

// useSearchParams verlangt einen Suspense-Grenzwert, sonst schlägt der Build fehl.
// Der eigentliche Hinweistext ist deshalb in eine kleine innere Komponente
// ausgelagert; das restliche Formular bleibt unverändert und muss nicht warten.
function LoginHinweis() {
  const hinweis = loginHinweis(useSearchParams().get("grund"))
  if (!hinweis) return null
  return <p className="text-sm text-ink-2">{hinweis}</p>
}

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
    router.push("/admin")
    router.refresh()
  }

  return (
    <AnmeldeRahmen titel="Anmelden">
      <form onSubmit={anmelden} className="flex flex-col gap-4">
        <Suspense fallback={null}>
          <LoginHinweis />
        </Suspense>
        <FormFeld label="E-Mail" htmlFor="login-email">
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={EINGABE_KLASSE}
          />
        </FormFeld>
        <FormFeld label="Passwort" htmlFor="login-passwort">
          <input
            id="login-passwort"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Passwort"
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            className={EINGABE_KLASSE}
          />
        </FormFeld>
        {fehler && (
          <p role="alert" className="text-sm text-crit">
            {fehler}
          </p>
        )}
        <Button type="submit" variante="primaer" groesse="md" disabled={laedt}>
          {laedt ? "…" : "Anmelden"}
        </Button>
        <div className="flex flex-col items-center gap-2">
          <Link href="/passwort-vergessen" className={AUTH_LINK_KLASSE}>
            Passwort vergessen?
          </Link>
          <Link href="/" className={AUTH_LINK_KLASSE}>
            ← Zur Website
          </Link>
        </div>
      </form>
    </AnmeldeRahmen>
  )
}
