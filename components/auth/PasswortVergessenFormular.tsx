"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { passwortVergessen } from "@/app/actions/passwort"

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
    <form onSubmit={absenden} className="flex w-full max-w-sm flex-col gap-3 rounded-card border border-line bg-surface p-6">
      <h1 className="font-display text-xl font-bold text-ink">Passwort vergessen</h1>
      {gesendet ? (
        <p className="text-sm text-ink-2">Falls ein aktives Konto zu dieser Adresse existiert, ist eine Mail unterwegs.</p>
      ) : (
        <>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-line-2 px-3 py-2 text-sm text-ink"
          />
          <button type="submit" disabled={laedt} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-on-brand disabled:opacity-60">
            {laedt ? "…" : "Link senden"}
          </button>
        </>
      )}
      <Link href="/login" className="text-center text-sm text-ink-2 hover:text-brand">
        ← Zum Login
      </Link>
    </form>
  )
}
