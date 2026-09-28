"use client"

import { useId, useState } from "react"
import { suchauftragSenden } from "@/app/actions/suchauftrag"
import { Button } from "@/components/shadcn/button"
import { AnfrageFeld } from "@/components/public/formular/AnfrageFeld"
import { AuswahlFeld } from "@/components/public/formular/AuswahlFeld"
import { DankeHinweis, FormularFehler, Honeypot } from "@/components/public/formular/FormularTeile"
import { useWebsiteFormular } from "@/components/public/formular/useWebsiteFormular"
import { NUTZUNG_OPTIONEN } from "@/lib/nutzung"

// Alle Felder als Text: Zahlen werden erst im Server-Schema geprüft ("" = keine Angabe).
const LEER = {
  firma: "", branche: "", name: "", email: "", telefon: "", nutzung: "", ort: "",
  flaecheMin: "", flaecheMax: "", budgetProM2: "", bezug: "", nachricht: "",
}
type Felder = typeof LEER
type FeldName = keyof Felder

export function SuchauftragFormular({ zeitToken }: { zeitToken: string }) {
  const id = useId()
  const [felder, setFelder] = useState<Felder>(LEER)
  const formular = useWebsiteFormular(zeitToken)
  const { feldFehler } = formular

  if (formular.gesendet) return <DankeHinweis danke={formular.dankeRef} />

  const feld = (name: FeldName | "webseite") => `${id}-${name}`
  // Gemeinsame Props je Feld: id, Wert, Fehler, Änderung.
  const p = (name: FeldName) => ({
    id: feld(name),
    wert: felder[name],
    fehler: feldFehler[name],
    onWechsel: (wert: string) => setFelder((f) => ({ ...f, [name]: wert })),
  })

  return (
    <form method="post" onSubmit={(e) => formular.senden(e, (schutz) => suchauftragSenden({ ...felder, ...schutz }))}
      noValidate aria-labelledby={`${id}-titel`} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
      <h2 id={`${id}-titel`} className="font-display text-xl font-bold text-ink">Suchauftrag erfassen</h2>
      {formular.fehler && <FormularFehler text={formular.fehler} fehlerRef={formular.fehlerRef} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <AnfrageFeld {...p("firma")} label="Firma" autoComplete="organization" maxLength={120} />
        <AnfrageFeld {...p("branche")} label="Branche" pflicht={false} maxLength={80} hinweis="z.B. Maschinenbau, Treuhand" />
        <AnfrageFeld {...p("name")} label="Name" autoComplete="name" maxLength={120} />
        <AnfrageFeld {...p("email")} label="E-Mail" typ="email" autoComplete="email" maxLength={200} />
        <AnfrageFeld {...p("telefon")} label="Telefon" typ="tel" pflicht={false} autoComplete="tel" maxLength={40} />
        <AuswahlFeld {...p("nutzung")} label="Nutzung" optionen={NUTZUNG_OPTIONEN} platzhalter="Bitte wählen …" />
        <AnfrageFeld {...p("ort")} label="Ort / Region" maxLength={80} />
        <AnfrageFeld {...p("flaecheMin")} label="Fläche von (m²)" pflicht={false} inputMode="numeric" maxLength={6} />
        <AnfrageFeld {...p("flaecheMax")} label="Fläche bis (m²)" pflicht={false} inputMode="numeric" maxLength={6} />
        <AnfrageFeld {...p("budgetProM2")} label="Budget (CHF pro m²)" pflicht={false} inputMode="numeric" maxLength={5} />
        <AnfrageFeld {...p("bezug")} label="Bezug ab" pflicht={false} maxLength={80} hinweis="z.B. sofort, Frühling 2027" breit />
      </div>
      <AnfrageFeld {...p("nachricht")} label="Nachricht" mehrzeilig pflicht={false} maxLength={2000} />

      <Honeypot id={feld("webseite")} wert={formular.webseite} onWechsel={formular.setWebseite} />

      <Button type="submit" disabled={!formular.bereit || formular.laeuft} className="self-start">
        {formular.laeuft ? "Wird gesendet …" : "Suchauftrag senden"}
      </Button>
      <p className="text-xs text-ink-3">Ihre Angaben verwenden wir nur, um passende Objekte für Sie zu finden.</p>
    </form>
  )
}
