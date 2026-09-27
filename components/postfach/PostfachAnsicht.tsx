"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { NachrichtenListe, type PostfachFilter } from "./NachrichtenListe"
import { EingangDetail } from "./EingangDetail"
import { GesendetDetail } from "./GesendetDetail"
import { alsAnfrageSpeichern } from "@/app/actions/nachrichten"
import type { NachrichtRow } from "@/lib/queries/nachrichten"
import type { Nutzung } from "@/types"

// Minimaler Ausschnitt eines Entwurfs (aus holeEntwuerfe, page.tsx), nur für
// die Rückfrage-Zuordnung in rueckfrageOeffnen unten benötigt.
export type RueckfrageEntwurf = { id: string; antwort_auf: string | null; an: string; typ: string }

export function PostfachAnsicht({
  nachrichten,
  rueckfragen,
}: {
  nachrichten: NachrichtRow[]
  rueckfragen: RueckfrageEntwurf[]
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<PostfachFilter>("alle")
  const [ausgewaehlteId, setAusgewaehlteId] = useState<string | null>(nachrichten[0]?.id ?? null)
  // Ein schneller Doppelklick auf "Als Anfrage speichern" könnte sonst zwei
  // überlappende Aufrufe für dieselbe nachrichtId auslösen; speichernLaufend wird an
  // EingangDetail durchgereicht, das seinen Speichern-Button damit sperrt.
  const [speichernLaufend, setSpeichernLaufend] = useState(false)
  // Kurze, optionale Erfolgsbestätigung nach dem Speichern (Reviewer-Vorschlag,
  // Minor) -- ersetzt den "Nachricht wählen."-Platzhalter einmalig, bis die Nutzerin
  // eine neue Nachricht (oder Rückfrage) auswählt.
  const [erfolg, setErfolg] = useState<string | null>(null)

  // Gleiches Ref-Muster wie in anderen Detail-Komponenten: während alsAnfrageSpeichern
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

  function gesendeteRueckfrageAuswaehlen(id: string) {
    setFilter("alle")
    setAusgewaehlteId(id)
    setErfolg(null)
    setSpeichernLaufend(false)
  }

  // Zuordnung primär über antwort_auf (eindeutig); typ+an nur als Fallback für
  // Altdaten ohne antwort_auf. Beide Quellen kommen bereits nach created_at
  // absteigend sortiert an, .find() trifft daher jeweils den jüngsten Eintrag.
  function rueckfrageOeffnen(eingang: NachrichtRow) {
    const gesendet = nachrichten.find((n) => n.richtung === "gesendet" && n.antwort_auf === eingang.id)
    if (gesendet) return gesendeteRueckfrageAuswaehlen(gesendet.id)
    const entwurf = rueckfragen.find((r) => r.antwort_auf === eingang.id)
    if (entwurf) return router.push(`/admin/entwuerfe?id=${entwurf.id}`)
    const legacyGesendet = nachrichten.find(
      (n) => n.richtung === "gesendet" && n.typ === "rueckfrage" && n.an === eingang.von
    )
    if (legacyGesendet) return gesendeteRueckfrageAuswaehlen(legacyGesendet.id)
    const legacyEntwurf = rueckfragen.find((r) => r.typ === "rueckfrage" && r.an === eingang.von)
    if (legacyEntwurf) return router.push(`/admin/entwuerfe?id=${legacyEntwurf.id}`)
    toast.info("Keine Rückfrage vorhanden.")
  }

  // EingangDetails onSpeichern reicht die von der Nutzerin manuell gewählte Nutzung
  // als optionales Argument durch, falls die KI-Erkennung nutzung nicht bestimmen
  // konnte -- das muss an alsAnfrageSpeichern weitergereicht werden. Der Eingang bleibt
  // nach Erfolg bestehen (alsAnfrageSpeichern löscht nicht mehr), die Auswahl wird
  // trotzdem aufgehoben, damit die Erfolgsmeldung sichtbar wird statt der unveränderten
  // Detailansicht.
  async function speichernAlsAnfrage(nachrichtId: string, nutzungUeberschreibung?: Nutzung) {
    setErfolg(null)
    // Wird beim Klick unconditional gesetzt -- nachrichtId ist zu diesem Zeitpunkt
    // garantiert die gerade angezeigte Nachricht (der Klick kam von deren Button).
    setSpeichernLaufend(true)
    try {
      const { fehler } = await alsAnfrageSpeichern(nachrichtId, nutzungUeberschreibung)
      if (ausgewaehlteIdRef.current !== nachrichtId) return
      if (fehler) toast.error(fehler)
      else {
        setAusgewaehlteId(null)
        setErfolg("Anfrage gespeichert.")
      }
    } catch {
      if (ausgewaehlteIdRef.current === nachrichtId) toast.error("Unerwarteter Fehler. Bitte Seite neu laden.")
    } finally {
      // Nur zurücksetzen, wenn nachrichtId noch die aktuell ausgewählte ist -- wurde
      // in der Zwischenzeit weggewechselt, hat der onAuswahl-Handler speichernLaufend
      // bereits synchron auf false gesetzt (siehe dort).
      if (ausgewaehlteIdRef.current === nachrichtId) setSpeichernLaufend(false)
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,340px)_minmax(0,1fr)] items-start gap-4">
      <div className="flex flex-col gap-3">
        <NachrichtenListe
          nachrichten={nachrichten}
          filter={filter}
          ausgewaehlteId={ausgewaehlteId}
          onFilterWechsel={setFilter}
          onAuswahl={(id) => {
            setAusgewaehlteId(id)
            setErfolg(null)
            // Siehe Kommentar in rueckfrageOeffnen: sofortiges Zurücksetzen,
            // unabhängig vom Ref-Guard in speichernAlsAnfrage, damit der
            // Speichern-Button der neu ausgewählten Nachricht nicht durch einen noch
            // laufenden Aufruf der VORHERIGEN Nachricht gesperrt bleibt.
            setSpeichernLaufend(false)
          }}
        />
      </div>
      <div className="rounded-card border border-line bg-surface">
        {!ausgewaehlt &&
          (erfolg ? (
            <p className="p-10 text-center text-sm text-good">{erfolg}</p>
          ) : (
            <p className="p-10 text-center text-sm text-ink-3">Nachricht wählen.</p>
          ))}
        {ausgewaehlt?.richtung === "eingang" && (
          <EingangDetail
            nachricht={ausgewaehlt}
            onSpeichern={(nutzungUeberschreibung) =>
              void speichernAlsAnfrage(ausgewaehlt.id, nutzungUeberschreibung)
            }
            onRueckfrageOeffnen={() => rueckfrageOeffnen(ausgewaehlt)}
            speichernLaufend={speichernLaufend}
          />
        )}
        {ausgewaehlt?.richtung === "gesendet" && <GesendetDetail nachricht={ausgewaehlt} />}
      </div>
    </div>
  )
}
