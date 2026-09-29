"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { passwortVergessen } from "@/app/actions/passwort"
import { Button } from "@/components/ui/Button"
import { EINGABE_KLASSE, FormFeld } from "@/components/ui/FormFeld"
import { AUTH_LINK_KLASSE } from "./AnmeldeRahmen"

export function PasswortVergessenFormular() {
  const [email, setEmail] = useState("")
  const [gesendet, setGesendet] = useState(false)
  const [laedt, setLaedt] = useState(false)

  async function absenden(ereignis: FormEvent) {
    ereignis.preventDefault()
    if (laedt) return
    setLaedt(true)
    await passwortVergessen(email)
    setLaedt(false)
    setGesendet(true)
  }

  return (
    <form onSubmit={absenden} className="flex flex-col gap-4">
      {gesendet ? (
        <p role="status" className="text-sm text-ink-2">
          Falls ein aktives Konto zu dieser Adresse existiert, ist eine Mail unterwegs.
        </p>
      ) : (
        <>
          <FormFeld label="E-Mail" htmlFor="vergessen-email">
            <input
              id="vergessen-email"
              type="email"
              required
              autoComplete="email"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={EINGABE_KLASSE}
            />
          </FormFeld>
          <Button type="submit" variante="primaer" groesse="md" disabled={laedt}>
            {laedt ? "…" : "Link senden"}
          </Button>
        </>
      )}
      <Link href="/login" className={`self-center ${AUTH_LINK_KLASSE}`}>
        ← Zum Login
      </Link>
    </form>
  )
}
