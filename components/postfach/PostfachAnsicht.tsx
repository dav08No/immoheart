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
  // Reviewer-Feedback Fix-Loop Runde 1: alsAnfrageSpeichern (app/actions/nachrichten.ts)
  // macht holeNachricht -> legeAnfrageAn -> loescheNachricht ohne Transaktion. Ohne
  // Sperre könnte ein schneller Doppelklick auf "Als Anfrage speichern" zwei
  // überlappende Aufrufe für dieselbe nachrichtId auslösen, die beide die noch nicht
  // gelöschte Zeile lesen und beide legeAnfrageAn aufrufen -- zwei doppelte Anfragen
  // aus einer Quelle-Nachricht (derselbe Race wie bereits in MailEinfuegen/Task 40 und
  // EntwurfDetail/Task 43 durch laedt/laufend verhindert). speichernLaufend wird an
  // EingangDetail durchgereicht, das seinen Speichern-Button damit sperrt.
  const [speichernLaufend, setSpeichernLaufend] = useState(false)
  // Kurze, optionale Erfolgsbestätigung nach dem Speichern (Reviewer-Vorschlag,
  // Minor) -- ersetzt den "Nachricht wählen."-Platzhalter einmalig, bis die Nutzerin
  // eine neue Nachricht (oder Rückfrage) auswählt.
  const [erfolg, setErfolg] = useState<string | null>(null)

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

  // Es gibt in nachrichten kein Fremdschlüsselfeld, das eine eingehende Anfrage
  // eindeutig mit "ihrer" Rückfrage verknüpft (Schema: nur anfrage_id/match_id, kein
  // "ausgeloest_von"). Der Treffer läuft deshalb weiterhin nur über typ+an -- wie
  // zuvor schon. Das öffnet ein Randfall-Risiko: sendet dieselbe Absenderin später
  // eine ZWEITE Anfrage, die erneut eine Rückfrage auslöst, existieren zwei Zeilen mit
  // typ === "rueckfrage" && an === vonEmail. Ein simples `.find()` (ohne richtung-
  // Filter) griffe dann implizit auf die Array-Reihenfolge zurück -- korrekt nur,
  // WEIL `nachrichten` aus holeNachrichten() bereits nach created_at absteigend
  // sortiert reinkommt (Zufall aus Sicht dieser Funktion, keine hier sichtbare
  // Garantie). Um nicht von dieser impliziten Sortierung abhängig zu sein, wird
  // explizit nach created_at sortiert und der JÜNGSTE Treffer gewählt -- die aktuell
  // relevante, offene Rückfrage, nicht eine ältere, bereits erledigte.
  function rueckfrageOeffnen(vonEmail: string) {
    const treffer = nachrichten
      .filter((n) => n.typ === "rueckfrage" && n.an === vonEmail)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0]
    if (treffer) {
      // Es gibt keinen eigenen Listen-Filter für richtung === "gesendet" (siehe
      // PostfachFilter in NachrichtenListe.tsx: nur "alle" | "eingang" | "entwurf").
      // Bei einer bereits gesendeten Rückfrage auf "entwurf" zu filtern würde sie aus
      // der linken Liste verschwinden lassen (das Detail rechts bliebe trotzdem
      // korrekt, da `ausgewaehlt` unabhängig vom Listen-Filter über die volle
      // `nachrichten`-Liste aufgelöst wird) -- "alle" zeigt sie stattdessen sichtbar
      // markiert in der Liste.
      setFilter(treffer.richtung === "entwurf" ? "entwurf" : "alle")
      setAusgewaehlteId(treffer.id)
      setFehler(null)
      setErfolg(null)
      // Reset unabhängig vom Staleness-Ref-Guard in speichernAlsAnfrage: verhindert,
      // dass ein noch laufender Speichern-Aufruf für die VORHERIGE Nachricht den
      // Speichern-Button der jetzt neu ausgewählten Nachricht gesperrt lässt (siehe
      // Kommentar bei speichernLaufend oben).
      setSpeichernLaufend(false)
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
    setErfolg(null)
    // Wird beim Klick unconditional gesetzt -- nachrichtId ist zu diesem Zeitpunkt
    // garantiert die gerade angezeigte Nachricht (der Klick kam von deren Button).
    setSpeichernLaufend(true)
    try {
      await alsAnfrageSpeichern(nachrichtId, nutzungUeberschreibung)
      if (ausgewaehlteIdRef.current === nachrichtId) {
        setAusgewaehlteId(null)
        setErfolg("Anfrage gespeichert.")
      }
    } catch (e) {
      if (ausgewaehlteIdRef.current === nachrichtId) setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      // Nur zurücksetzen, wenn nachrichtId noch die aktuell ausgewählte ist -- wurde
      // in der Zwischenzeit weggewechselt, hat der onAuswahl-Handler speichernLaufend
      // bereits synchron auf false gesetzt (siehe dort); ein verspätetes Zurücksetzen
      // hier dürfte NICHT den Zustand einer inzwischen anders ausgewählten Nachricht
      // überschreiben (analog zum fehler-Guard oben).
      if (ausgewaehlteIdRef.current === nachrichtId) setSpeichernLaufend(false)
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
        {fehler && <div className="border-b border-line p-3 text-sm text-crit">{fehler}</div>}
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
            onRueckfrageOeffnen={() => rueckfrageOeffnen(ausgewaehlt.von)}
            speichernLaufend={speichernLaufend}
          />
        )}
        {ausgewaehlt && ausgewaehlt.richtung !== "eingang" && (
          <EntwurfDetail key={ausgewaehlt.id} nachricht={ausgewaehlt} />
        )}
      </div>
    </div>
  )
}
