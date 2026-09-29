"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { erstelleBrowserClient } from "@/lib/supabase/client"
import { passwortFehlerText } from "@/lib/passwort-fehler"
import { Button } from "@/components/ui/Button"
import { EINGABE_KLASSE, FormFeld } from "@/components/ui/FormFeld"

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
    <form onSubmit={speichern} className="flex flex-col gap-4">
      <p className="text-sm text-ink-2 wrap-anywhere">{email}</p>
      <FormFeld label="Neues Passwort" htmlFor="neues-passwort">
        <input
          id="neues-passwort"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Neues Passwort"
          value={passwort}
          onChange={(e) => setPasswort(e.target.value)}
          className={EINGABE_KLASSE}
        />
      </FormFeld>
      <FormFeld label="Passwort wiederholen" htmlFor="passwort-wiederholen">
        <input
          id="passwort-wiederholen"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Passwort wiederholen"
          value={wiederholung}
          onChange={(e) => setWiederholung(e.target.value)}
          className={EINGABE_KLASSE}
        />
      </FormFeld>
      {fehler && (
        <p role="alert" className="text-sm text-crit">
          {fehler}
        </p>
      )}
      <Button type="submit" variante="primaer" groesse="md" disabled={laedt}>
        {laedt ? "…" : "Passwort speichern"}
      </Button>
    </form>
  )
}
