"use client"

import { useEffect, useRef, useState } from "react"
import { NachrichtenListe, type PostfachFilter } from "./NachrichtenListe"
import { EingangDetail } from "./EingangDetail"
import { EntwurfDetail } from "./EntwurfDetail"
import { MailEinfuegen } from "./MailEinfuegen"
import { alsAnfrageSpeichern } from "@/app/actions/nachrichten"
import type { NachrichtRow } from "@/lib/queries/nachrichten"
import type { Nutzung } from "@/types"

export function PostfachAnsicht({ nachrichten }: { nachrichten: NachrichtRow[] }) {
  const [filter, setFilter] = useState<PostfachFilter>("alle")
  const [ausgewaehlteId, setAusgewaehlteId] = useState<string | null>(nachrichten[0]?.id ?? null)
  // alsAnfrageSpeichern (Task 39) wirft bewusst (siehe Kommentar dort), z.B. wenn
  // nutzung trotz manueller Auswahl nicht bestimmt werden konnte. Ohne sichtbares
  // Feedback landet der sorgfältig formulierte Fehlertext nur in der Browser-Konsole
  // (Offener Punkt aus Task 39s Review, s. Plan). Milestone-Konvention (MailEinfuegen/
  // Task 40, EntwurfDetail/Task 43): lokaler fehler-State, gerendert in text-crit.
  const [fehler, setFehler] = useState<string | null>(null)

  // Analog zu EntwurfDetails nachrichtIdRef (Task 43): während alsAnfrageSpeichern
  // läuft, könnte die Nutzerin in NachrichtenListe bereits eine andere Nachricht
  // auswählen (die Liste wird während des Speicherns nicht gesperrt). Träfe die
  // Antwort danach ein, dürfte ein Fehler aus dem ALTEN Aufruf nicht über der NEU
  // ausgewählten Nachricht angezeigt werden. Der Ref hält deshalb immer die zuletzt
  // ausgewählte ID, von der Speichern-Funktion unten verglichen statt aus einer
  // veralteten Closure gelesen.
  const ausgewaehlteIdRef = useRef(ausgewaehlteId)
  useEffect(() => {
    ausgewaehlteIdRef.current = ausgewaehlteId
  }, [ausgewaehlteId])

  const ausgewaehlt = nachrichten.find((n) => n.id === ausgewaehlteId) ?? null

  function rueckfrageOeffnen(vonEmail: string) {
    const treffer = nachrichten.find(
      (n) => n.richtung === "entwurf" && n.typ === "rueckfrage" && n.an === vonEmail
    )
    if (treffer) {
      setFilter("entwurf")
      setAusgewaehlteId(treffer.id)
      setFehler(null)
    }
  }

  // Nachtrag aus Task 42: EingangDetails onSpeichern reicht die von der Nutzerin
  // manuell gewählte Nutzung als optionales Argument durch, falls die KI-Erkennung
  // nutzung nicht bestimmen konnte -- das muss an alsAnfrageSpeichern weitergereicht
  // werden. alsAnfrageSpeichern löscht bei Erfolg die Quelle-Nachricht
  // (loescheNachricht, siehe app/actions/nachrichten.ts) -- die gespeicherte Nachricht
  // verschwindet also aus der Liste. Die Auswahl wird deshalb explizit aufgehoben,
  // statt darauf zu vertrauen, dass das `nachrichten`-Prop nach revalidatePath
  // rechtzeitig nachzieht -- sonst würde `ausgewaehlt` für einen kurzen Moment auf
  // eine bereits gelöschte Zeile zeigen (kein Crash dank `.find(...) ?? null`, aber
  // sichtbar veraltete Daten).
  async function speichernAlsAnfrage(nachrichtId: string, nutzungUeberschreibung?: Nutzung) {
    setFehler(null)
    try {
      await alsAnfrageSpeichern(nachrichtId, nutzungUeberschreibung)
      if (ausgewaehlteIdRef.current === nachrichtId) setAusgewaehlteId(null)
    } catch (e) {
      if (ausgewaehlteIdRef.current === nachrichtId) setFehler(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,340px)_minmax(0,1fr)] items-start gap-4">
      <div className="flex flex-col gap-3">
        <MailEinfuegen />
        <NachrichtenListe
          nachrichten={nachrichten}
          filter={filter}
          ausgewaehlteId={ausgewaehlteId}
          onFilterWechsel={setFilter}
          onAuswahl={(id) => {
            setAusgewaehlteId(id)
            setFehler(null)
          }}
        />
      </div>
      <div className="rounded-card border border-line bg-surface">
        {fehler && <div className="border-b border-line p-3 text-sm text-crit">{fehler}</div>}
        {!ausgewaehlt && <p className="p-10 text-center text-sm text-ink-3">Nachricht wählen.</p>}
        {ausgewaehlt?.richtung === "eingang" && (
          <EingangDetail
            nachricht={ausgewaehlt}
            onSpeichern={(nutzungUeberschreibung) =>
              void speichernAlsAnfrage(ausgewaehlt.id, nutzungUeberschreibung)
            }
            onRueckfrageOeffnen={() => rueckfrageOeffnen(ausgewaehlt.von)}
          />
        )}
        {ausgewaehlt && ausgewaehlt.richtung !== "eingang" && (
          <EntwurfDetail key={ausgewaehlt.id} nachricht={ausgewaehlt} />
        )}
      </div>
    </div>
  )
}
