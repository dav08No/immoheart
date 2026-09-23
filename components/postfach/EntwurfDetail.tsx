"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { entwurfSenden, entwurfBearbeiten, entwurfVerwerfen } from "@/app/actions/nachrichten"
import type { NachrichtRow } from "@/lib/queries/nachrichten"

const GRUENDE = ["Passt nicht zur Lage", "Preis unrealistisch", "Zu früh", "Anderer Grund"]

export function EntwurfDetail({ nachricht }: { nachricht: NachrichtRow }) {
  const [bearbeiten, setBearbeiten] = useState(false)
  const [body, setBody] = useState(nachricht.body)
  const [verwerfenOffen, setVerwerfenOffen] = useState(false)
  // null = keine Aktion läuft, sonst welche -- steuert sowohl die Button-Beschriftung
  // als auch das Deaktivieren ALLER Aktions-Buttons während einer laufenden Aktion.
  // Ein einzelnes Flag statt drei separater laedt-Booleans, weil Senden/Übernehmen/
  // Verwerfen sich gegenseitig ausschliessen sollen -- dieselbe Nachricht darf nicht
  // gleichzeitig gesendet und verworfen werden.
  const [laufend, setLaufend] = useState<"senden" | "uebernehmen" | "verwerfen" | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  // PostfachAnsicht (Task 44, noch nicht gebaut) rendert `<EntwurfDetail nachricht={ausgewaehlt} />`
  // voraussichtlich OHNE `key={nachricht.id}` (siehe EingangDetail/Task 42, das denselben
  // Aufrufstil hat). Beim Wechsel der Auswahl in NachrichtenListe bekommt dieselbe
  // Komponenteninstanz dann einfach ein neues `nachricht`-Prop, statt neu zu mounten.
  // Ohne diesen Sync würde lokaler UI-State (Entwurfstext im Bearbeiten-Modus, ob
  // gerade bearbeitet wird, eine alte Fehlermeldung) von der vorherigen Nachricht
  // kleben bleiben -- im schlimmsten Fall liesse sich der angepasste Text EINER
  // Nachricht als Übernehmen-Aufruf für eine ANDERE Nachricht absenden. Deshalb wird
  // bei jedem Wechsel der Nachricht-ID der gesamte lokale State zurückgesetzt.
  useEffect(() => {
    setBody(nachricht.body)
    setBearbeiten(false)
    setVerwerfenOffen(false)
    setFehler(null)
    setLaufend(null)
    // Bewusst nur an nachricht.id gekoppelt, nicht an nachricht.body: dieser Effekt
    // soll ausschliesslich beim Wechsel der ausgewählten Nachricht greifen. Würde
    // nachricht.body mit aufgenommen, liefe der Reset auch nach jedem erfolgreichen
    // `uebernehmen()` erneut (das ändert nachricht.body für dieselbe id über
    // revalidatePath) -- harmlos, aber unnötig, da uebernehmen() den Edit-Modus
    // bereits selbst schliesst.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nachricht.id])

  const versendet = nachricht.gesendet_am !== null

  // entwurfSenden/entwurfBearbeiten/entwurfVerwerfen (Task 39) werfen bewusst statt
  // Fehler stillschweigend zu verschlucken (Milestone-Konvention, siehe MailEinfuegen/
  // Task 40). Jeder Aufruf hier läuft deshalb durch try/catch, der Fehler landet
  // sichtbar in `fehler` statt nur in der Konsole.
  async function senden() {
    setLaufend("senden")
    setFehler(null)
    try {
      await entwurfSenden(nachricht.id)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setLaufend(null)
    }
  }

  async function uebernehmen() {
    setLaufend("uebernehmen")
    setFehler(null)
    try {
      await entwurfBearbeiten(nachricht.id, body)
      setBearbeiten(false)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setLaufend(null)
    }
  }

  async function verwerfen(grund: string) {
    setLaufend("verwerfen")
    setFehler(null)
    try {
      await entwurfVerwerfen(nachricht.id, grund)
      setVerwerfenOffen(false)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setLaufend(null)
    }
  }

  return (
    <div>
      <div className="border-b border-line p-4">
        <div className="font-display text-base font-bold text-ink">{nachricht.betreff}</div>
        <div className="mt-0.5 text-xs text-ink-3">
          {versendet ? "Gesendet" : "Entwurf von immoheart · noch nicht gesendet"}
        </div>
      </div>
      <div className="p-4">
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="flex gap-2.5 border-b border-line px-3 py-2 text-xs">
            <span className="w-12 flex-none text-ink-3">An</span>
            <span className="text-ink-2">{nachricht.an}</span>
          </div>
          <div className="flex gap-2.5 border-b border-line px-3 py-2 text-xs">
            <span className="w-12 flex-none text-ink-3">Betreff</span>
            <span className="text-ink-2">{nachricht.betreff}</span>
          </div>
          {bearbeiten ? (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              disabled={laufend !== null}
              className="w-full p-3 text-sm text-ink disabled:opacity-60"
            />
          ) : (
            <div className="whitespace-pre-wrap p-3 text-sm text-ink-2">{nachricht.body}</div>
          )}
        </div>

        {fehler && <div className="mt-2.5 text-sm text-crit">{fehler}</div>}

        {!versendet && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            <Button variante="primaer" onClick={senden} disabled={laufend !== null}>
              {laufend === "senden" ? "Wird gesendet…" : "Senden"}
            </Button>
            {bearbeiten ? (
              <>
                <Button onClick={uebernehmen} disabled={laufend !== null}>
                  {laufend === "uebernehmen" ? "Wird übernommen…" : "Übernehmen"}
                </Button>
                <Button
                  onClick={() => {
                    setBody(nachricht.body)
                    setBearbeiten(false)
                  }}
                  disabled={laufend !== null}
                >
                  Abbrechen
                </Button>
              </>
            ) : (
              <Button onClick={() => setBearbeiten(true)} disabled={laufend !== null}>
                Bearbeiten
              </Button>
            )}
            <Button onClick={() => setVerwerfenOffen((v) => !v)} disabled={laufend !== null}>
              Verwerfen
            </Button>
          </div>
        )}

        {verwerfenOffen && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-dashed border-line-2 pt-3">
            {GRUENDE.map((grund) => (
              <button
                key={grund}
                onClick={() => verwerfen(grund)}
                disabled={laufend !== null}
                className="rounded-full border border-line-2 px-2.5 py-1 text-xs text-ink-2 hover:border-brand hover:text-brand disabled:opacity-60"
              >
                {grund}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
