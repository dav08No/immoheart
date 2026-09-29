"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { nameAendern } from "@/app/actions/profil"
import { erstelleBrowserClient } from "@/lib/supabase/client"
import { passwortFehlerText } from "@/lib/passwort-fehler"
import { Button } from "@/components/ui/Button"
import { EINGABE_KLASSE, FormFeld } from "@/components/ui/FormFeld"
import { Panel, PanelKopf } from "@/components/ui/Panel"

const MINDESTLAENGE = 8

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
    if (error) return void toast.error(passwortFehlerText(error.code))
    setPasswort("")
    setWiederholung("")
    toast.success("Passwort geändert")
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <Panel as="section">
        {/* E-Mail als Beschreibung: PanelKopf bricht lange Adressen um statt zu überlaufen. */}
        {/* "Anzeigename" statt "Name": das Feld darunter heisst schon "Name" (keine Doppelung). */}
        <PanelKopf titel="Anzeigename" beschreibung={email} />
        <form onSubmit={nameSpeichern} className="flex flex-col gap-4">
          <FormFeld label="Name" htmlFor="profil-name">
            <input id="profil-name" required value={name} onChange={(e) => setName(e.target.value)} className={EINGABE_KLASSE} />
          </FormFeld>
          <div className="flex justify-end">
            <Button type="submit" variante="primaer" disabled={laedt !== null}>
              {laedt === "name" ? "…" : "Name speichern"}
            </Button>
          </div>
        </form>
      </Panel>
      <Panel as="section">
        <PanelKopf titel="Passwort ändern" />
        <form onSubmit={passwortSpeichern} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormFeld label="Neues Passwort" htmlFor="profil-passwort">
              <input
                id="profil-passwort"
                type="password"
                autoComplete="new-password"
                placeholder="Neues Passwort"
                value={passwort}
                onChange={(e) => setPasswort(e.target.value)}
                className={EINGABE_KLASSE}
              />
            </FormFeld>
            <FormFeld label="Wiederholen" htmlFor="profil-wiederholung">
              <input
                id="profil-wiederholung"
                type="password"
                autoComplete="new-password"
                placeholder="Wiederholen"
                value={wiederholung}
                onChange={(e) => setWiederholung(e.target.value)}
                className={EINGABE_KLASSE}
              />
            </FormFeld>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variante="primaer" disabled={laedt !== null}>
              {laedt === "passwort" ? "…" : "Passwort ändern"}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  )
}
