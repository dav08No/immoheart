"use client"

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react"
import { CircleCheck } from "lucide-react"
import { objektAnfragen, zeitTokenHolen } from "@/app/actions/objektanfrage"
import { Button } from "@/components/shadcn/button"
import { AnfrageFeld } from "./AnfrageFeld"

type Props = { objektId: string; zeitToken: string; nachrichtVorlage: string }

type Felder = { firma: string; name: string; email: string; telefon: string; nachricht: string }
type FeldName = keyof Felder

const ALLGEMEINER_FEHLER = "Ihre Anfrage konnte gerade nicht gesendet werden. Bitte versuchen Sie es später erneut."

// Ein neues Token startet die Mindestzeit neu; scheitert der Abruf, bleibt das alte
// und die nächste Einsendung meldet erneut den Token-Fehler.
async function neuesToken(): Promise<string | null> {
  try {
    return await zeitTokenHolen()
  } catch {
    return null
  }
}

export function AnfrageFormular({ objektId, zeitToken: startToken, nachrichtVorlage }: Props) {
  const id = useId()
  const [zeitToken, setZeitToken] = useState(startToken)
  const [felder, setFelder] = useState<Felder>({ firma: "", name: "", email: "", telefon: "", nachricht: nachrichtVorlage })
  const [webseite, setWebseite] = useState("")
  const [fehler, setFehler] = useState<string | null>(null)
  const [feldFehler, setFeldFehler] = useState<Partial<Record<FeldName, string>>>({})
  const [gesendet, setGesendet] = useState(false)
  const [laeuft, starte] = useTransition()
  const fehlerRef = useRef<HTMLDivElement>(null)
  const dankeRef = useRef<HTMLDivElement>(null)

  // Nach dem Senden den Fokus auf die Rückmeldung setzen, sonst bleibt er auf
  // einem deaktivierten bzw. verschwundenen Knopf hängen.
  useEffect(() => {
    if (fehler) fehlerRef.current?.focus()
  }, [fehler])
  useEffect(() => {
    if (gesendet) dankeRef.current?.focus()
  }, [gesendet])
  // Konnte der Server beim Rendern kein Token erzeugen, jetzt eines nachholen.
  useEffect(() => {
    if (startToken) return
    void neuesToken().then((token) => {
      if (token) setZeitToken(token)
    })
  }, [startToken])

  const setze = (feld: FeldName) => (wert: string) => setFelder((f) => ({ ...f, [feld]: wert }))

  function senden(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (laeuft || gesendet) return
    setFehler(null)
    starte(async () => {
      try {
        const ergebnis = await objektAnfragen({ ...felder, objektId, webseite, zeitToken })
        if (ergebnis.ok) {
          setGesendet(true)
          return
        }
        // Eingaben bleiben stehen; nur das Token wird für den nächsten Versuch ersetzt.
        if (ergebnis.tokenErneuern) {
          const token = await neuesToken()
          if (token) setZeitToken(token)
        }
        setFeldFehler(ergebnis.feldFehler ?? {})
        setFehler(ergebnis.fehler)
      } catch {
        // Netzwerk weg o.ä.: die Action selbst wirft nie, der Aufruf schon.
        setFeldFehler({})
        setFehler(ALLGEMEINER_FEHLER)
      }
    })
  }

  if (gesendet) {
    return (
      <div ref={dankeRef} tabIndex={-1} role="status" className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-6 outline-none">
        <CircleCheck className="size-8 text-good" aria-hidden />
        <h2 className="font-display text-xl font-bold text-ink">Danke!</h2>
        <p className="text-ink-2">Wir melden uns innerhalb von 1–2 Werktagen.</p>
      </div>
    )
  }

  const feld = (name: FeldName | "webseite") => `${id}-${name}`

  return (
    <form onSubmit={senden} noValidate aria-labelledby={`${id}-titel`} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
      <h2 id={`${id}-titel`} className="font-display text-xl font-bold text-ink">Objekt anfragen</h2>
      {fehler && (
        <div ref={fehlerRef} tabIndex={-1} role="alert" className="rounded-md bg-crit-bg px-3 py-2 text-sm text-crit outline-none">
          {fehler}
        </div>
      )}
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

      {/* Honeypot: für Menschen unsichtbar und nicht erreichbar, Bots füllen es aus. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={feld("webseite")}>Webseite</label>
        <input id={feld("webseite")} name="webseite" type="text" tabIndex={-1} autoComplete="off"
          value={webseite} onChange={(e) => setWebseite(e.target.value)} />
      </div>

      <Button type="submit" disabled={laeuft} className="self-start">
        {laeuft ? "Wird gesendet …" : "Anfrage senden"}
      </Button>
      <p className="text-xs text-ink-3">Ihre Angaben verwenden wir nur, um Ihre Anfrage zu beantworten.</p>
    </form>
  )
}
