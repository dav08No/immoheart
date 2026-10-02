"use client"

import { useId, useState } from "react"
import { objektAnfragen } from "@/app/actions/objektanfrage"
import { Button } from "@/components/shadcn/button"
import { AnfrageFeld } from "@/components/public/formular/AnfrageFeld"
import { DankeHinweis, FormularFehler, Honeypot } from "@/components/public/formular/FormularTeile"
import { useWebsiteFormular } from "@/components/public/formular/useWebsiteFormular"

// reserviert: Formular bleibt nutzbar (Spec §3) -- fällt die Reservierung weg, ist die
// nächste Firma schon da.
type Props = { objektId: string; zeitToken: string; nachrichtVorlage: string; reserviert?: boolean }

type Felder = { firma: string; name: string; email: string; telefon: string; nachricht: string }
type FeldName = keyof Felder

export function AnfrageFormular({ objektId, zeitToken, nachrichtVorlage, reserviert = false }: Props) {
  const id = useId()
  const [felder, setFelder] = useState<Felder>({ firma: "", name: "", email: "", telefon: "", nachricht: nachrichtVorlage })
  const formular = useWebsiteFormular(zeitToken)
  const { feldFehler } = formular

  const setze = (feld: FeldName) => (wert: string) => setFelder((f) => ({ ...f, [feld]: wert }))

  if (formular.gesendet) return <DankeHinweis danke={formular.dankeRef} />

  const feld = (name: FeldName | "webseite") => `${id}-${name}`

  return (
    <form method="post" onSubmit={(e) => formular.senden(e, (schutz) => objektAnfragen({ ...felder, objektId, ...schutz }))}
      noValidate aria-labelledby={`${id}-titel`} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
      <h2 id={`${id}-titel`} className="font-display text-xl font-bold text-ink">Objekt anfragen</h2>
      {reserviert && (
        <p className="rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn">Derzeit reserviert – Sie können trotzdem Interesse anmelden.</p>
      )}
      {formular.fehler && <FormularFehler text={formular.fehler} fehlerRef={formular.fehlerRef} />}
      <AnfrageFeld id={feld("firma")} label="Firma" wert={felder.firma} fehler={feldFehler.firma} onWechsel={setze("firma")}
        autoComplete="organization" maxLength={120} />
      <AnfrageFeld id={feld("name")} label="Name" wert={felder.name} fehler={feldFehler.name} onWechsel={setze("name")}
        autoComplete="name" maxLength={120} />
      <AnfrageFeld id={feld("email")} label="E-Mail" typ="email" wert={felder.email} fehler={feldFehler.email}
        onWechsel={setze("email")} autoComplete="email" maxLength={200} />
      <AnfrageFeld id={feld("telefon")} label="Telefon" typ="tel" pflicht={false} wert={felder.telefon}
        fehler={feldFehler.telefon} onWechsel={setze("telefon")} autoComplete="tel" maxLength={40} />
      <AnfrageFeld id={feld("nachricht")} label="Nachricht" mehrzeilig wert={felder.nachricht} fehler={feldFehler.nachricht}
        onWechsel={setze("nachricht")} maxLength={2000} />

      <Honeypot id={feld("webseite")} wert={formular.webseite} onWechsel={formular.setWebseite} />

      <Button type="submit" disabled={!formular.bereit || formular.laeuft} className="self-start">
        {formular.laeuft ? "Wird gesendet …" : "Anfrage senden"}
      </Button>
      <p className="text-xs text-ink-3">Ihre Angaben verwenden wir nur, um Ihre Anfrage zu beantworten.</p>
    </form>
  )
}
