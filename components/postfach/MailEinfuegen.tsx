"use client"

import { useState } from "react"
import { nachrichtEingegangen } from "@/app/actions/nachrichten"
import { Button } from "@/components/ui/Button"

export function MailEinfuegen() {
  const [offen, setOffen] = useState(false)
  const [von, setVon] = useState("")
  const [betreff, setBetreff] = useState("")
  const [text, setText] = useState("")
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function absenden() {
    setLaedt(true)
    setFehler(null)
    try {
      await nachrichtEingegangen(text, von, betreff)
      setLaedt(false)
      setOffen(false)
      setVon("")
      setBetreff("")
      setText("")
    } catch (e) {
      // Rohtext ist laut Task 39 bereits gespeichert, bevor die KI angefragt wird --
      // ein Fehler hier bedeutet also nicht, dass die Nachricht verloren ist, nur
      // dass die Erkennung fehlgeschlagen ist. Deshalb Dialog offen lassen und die
      // eingegebenen Werte NICHT löschen, damit nichts erneut abgetippt werden muss.
      const meldung = e instanceof Error ? e.message : String(e)
      setFehler(`Fehler beim Verarbeiten der Mail. Bitte erneut versuchen. ${meldung}`)
      setLaedt(false)
    }
  }

  if (!offen) {
    return (
      <Button variante="primaer" onClick={() => setOffen(true)} className="w-full">
        Neue Mail einfügen
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface-2 p-3">
      <input
        placeholder="Absender-E-Mail"
        value={von}
        onChange={(e) => {
          setVon(e.target.value)
          setFehler(null)
        }}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 text-sm text-ink"
      />
      <input
        placeholder="Betreff"
        value={betreff}
        onChange={(e) => {
          setBetreff(e.target.value)
          setFehler(null)
        }}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 text-sm text-ink"
      />
      <textarea
        placeholder="Mailtext einfügen…"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setFehler(null)
        }}
        rows={8}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 text-sm text-ink"
      />
      {fehler && <div className="text-sm text-crit">{fehler}</div>}
      <div className="flex gap-2">
        <Button variante="primaer" onClick={absenden} disabled={laedt || !von || !text}>
          {laedt ? "KI liest…" : "Übernehmen"}
        </Button>
        <Button onClick={() => setOffen(false)} disabled={laedt}>
          Abbrechen
        </Button>
      </div>
    </div>
  )
}
