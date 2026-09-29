"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PulsHero } from "./PulsHero"
import { MatchCard } from "./MatchCard"
import { MatchDetail } from "./MatchDetail"
import { Panel, PanelKopf } from "@/components/ui/Panel"
import { Kennzahl } from "@/components/ui/Kennzahl"
import { Leerzustand } from "@/components/ui/Leerzustand"
import { ListenZeile } from "@/components/ui/ListenZeile"
import { Button } from "@/components/ui/Button"
import { matchSenden, matchVerwerfen, anfrageNachfragen } from "@/app/actions/matches"
import { formatZahl } from "@/lib/format"
import type { NeuerMatch } from "@/lib/queries/matches"
import type { AnfrageMitFirma } from "@/lib/queries/anfragen"

export function MatchesAnsicht({
  matches, letzteKontakte, offeneAnzahl, langeStillAnzahl, objektAnzahl, langeStillAnfragen,
}: {
  matches: NeuerMatch[]
  letzteKontakte: Date[]
  offeneAnzahl: number
  langeStillAnzahl: number
  objektAnzahl: number
  langeStillAnfragen: AnfrageMitFirma[]
}) {
  const router = useRouter()
  const [ausgewaehlteId, setAusgewaehlteId] = useState<string | null>(null)
  const ausgewaehlt = matches.find((m) => m.id === ausgewaehlteId) ?? null

  // Ein einziger seitenweiter Banner statt eines Fehler-States pro Karte/
  // Zeile: diese Seite hat drei unabhängige Aktionsorte (Match-Karten, die
  // "Lange nichts gehört"-Zeilen, das Detail-Drawer), aber matchSenden und
  // anfrageNachfragen (app/actions/matches.ts, Task 61) werfen inzwischen
  // regulär über empfaengerFuerAnfrage, sobald einer Anfrage die firma_id
  // fehlt oder die verknüpfte Firma keine kontakt_email hinterlegt hat --
  // laut Task-61-Review der Normalfall für jede nicht per seed.sql angelegte
  // Anfrage, da firma_id über keine App-UI setzbar ist. Ein Banner reicht
  // hier aus (statt pro Karte), weil beide Server Actions VOR jeder
  // Statusänderung werfen: die betroffene Karte/Zeile bleibt unverändert
  // sichtbar (kein revalidatePath ohne Erfolg), der Banner benennt zusätzlich
  // das Objekt bzw. die Firma, damit die Zuordnung eindeutig bleibt, auch
  // wenn der Drawer inzwischen schon wieder geschlossen ist.
  const [fehler, setFehler] = useState<string | null>(null)
  // Sperre pro Aktion (N3-Review, Fund 7): id des Matches bzw. der Anfrage, deren
  // Server Action gerade läuft. Nur die betroffene Karte/Zeile/der Drawer wird
  // gesperrt (Buttons disabled) -- andere Matches bleiben bedienbar. Verhindert
  // z.B. einen Doppelklick auf "Angebot entwerfen", der sonst zwei KI-Aufrufe und
  // zwei Entwürfe für dasselbe Match auslösen könnte.
  const [laufendId, setLaufendId] = useState<string | null>(null)

  function fehlertext(e: unknown): string {
    return e instanceof Error ? e.message : String(e)
  }

  // setAusgewaehlteId(null) läuft bewusst weiterhin VOR dem await, wie im
  // Plan-Doc-Startcode: MatchDetail (Task 64) merkt sich die zuletzt
  // gezeigten Daten selbst (letzterMatch) und schliesst sauber animiert,
  // auch sobald `match` bereits null ist -- ein sofortiges Schliessen ist
  // also unabhängig vom Ausgang der Aktion visuell unproblematisch. Schlägt
  // die Aktion fehl, bleibt die betroffene Karte trotzdem sichtbar (siehe
  // Kommentar bei `fehler` oben), der Banner nennt zusätzlich das Objekt.
  async function senden(id: string) {
    if (laufendId) return
    setLaufendId(id)
    setAusgewaehlteId(null)
    setFehler(null)
    try {
      const { entwurfId } = await matchSenden(id)
      router.push(`/admin/entwuerfe?id=${entwurfId}`)
    } catch (e) {
      const objekt = matches.find((m) => m.id === id)?.objekt.titel ?? "dieses Match"
      setFehler(`Angebot entwerfen fehlgeschlagen (${objekt}): ${fehlertext(e)}`)
    } finally {
      setLaufendId(null)
    }
  }
  async function verwerfen(id: string) {
    if (laufendId) return
    setLaufendId(id)
    setAusgewaehlteId(null)
    setFehler(null)
    try {
      await matchVerwerfen(id)
    } catch (e) {
      const objekt = matches.find((m) => m.id === id)?.objekt.titel ?? "dieses Match"
      setFehler(`Verwerfen fehlgeschlagen (${objekt}): ${fehlertext(e)}`)
    } finally {
      setLaufendId(null)
    }
  }
  async function nachfragen(id: string, wer: string) {
    if (laufendId) return
    setLaufendId(id)
    setFehler(null)
    try {
      const { entwurfId } = await anfrageNachfragen(id)
      router.push(`/admin/entwuerfe?id=${entwurfId}`)
    } catch (e) {
      setFehler(`Nachfass entwerfen fehlgeschlagen (${wer}): ${fehlertext(e)}`)
    } finally {
      setLaufendId(null)
    }
  }

  return (
    <>
      {/* Controller-Ruling (Nachtrag zu Task 3): die vier Überblickszahlen bleiben eine
          eigene Kachelreihe über Bestandspuls, nicht nur Text in dessen Beschreibung --
          gleiche Werte/Labels wie zuvor, nur als Kennzahl-Baustein statt Ad-hoc-Divs. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl label="Neue Matches" wert={formatZahl(matches.length)} />
        <Kennzahl label="Offene Anfragen" wert={formatZahl(offeneAnzahl)} />
        <Kennzahl label="Objekte" wert={formatZahl(objektAnzahl)} />
        <Kennzahl label="Lange still" wert={formatZahl(langeStillAnzahl)} />
      </div>

      <Panel>
        <PanelKopf titel="Bestandspuls" beschreibung="Wie frisch der letzte Kontakt zu offenen Anfragen ist." />
        <PulsHero letzteKontakte={letzteKontakte} />
      </Panel>

      {fehler && (
        // Gleicher Fehlerbanner wie Anfragen/Postfach; role="alert" liest ihn sofort vor.
        <div role="alert" className="rounded-panel border border-crit/40 bg-crit-bg px-4 py-2.5 text-sm text-crit wrap-break-word">
          {fehler}
        </div>
      )}

      <Panel>
        <PanelKopf titel="Neue Treffer" aktionen={<span className="text-xs text-ink-2">{matches.length} Vorschläge</span>} />
        {matches.length === 0 ? (
          <Leerzustand text="Keine offenen Matches." />
        ) : (
          <div className="flex flex-col gap-3">
            {matches.map((m) => (
              <MatchCard
                key={m.id} match={m}
                laufend={laufendId === m.id}
                onOeffnen={() => setAusgewaehlteId(m.id)}
                onSenden={() => void senden(m.id)}
                onVerwerfen={() => void verwerfen(m.id)}
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <PanelKopf
          titel="Lange nichts gehört"
          aktionen={<span className="text-xs text-ink-2">{langeStillAnfragen.length} Anfragen</span>}
        />
        {langeStillAnfragen.length === 0 ? (
          <Leerzustand text="Alle offenen Anfragen wurden kürzlich kontaktiert." klein />
        ) : (
          <div className="flex flex-col gap-1">
            {langeStillAnfragen.map((a) => {
              const id = a.id
              const wer = a.firma?.name ?? "diese Anfrage"
              const tage = Math.floor((Date.now() - new Date(a.letzter_kontakt).getTime()) / 86_400_000)
              return (
                <ListenZeile
                  key={id}
                  icon={<span aria-hidden className={`block size-2 rounded-full ${tage > 60 ? "bg-crit" : "bg-warn"}`} />}
                  titel={a.firma?.name ?? "?"}
                  unterzeile={`${a.flaeche_min ?? "?"}–${a.flaeche_max ?? "?"} m² · ${a.ort ?? "?"}`}
                  zeit={`${tage} Tage`}
                  aktion={
                    <Button variante="sekundaer" onClick={() => void nachfragen(id, wer)} disabled={laufendId === id}>
                      {laufendId === id ? "Wird bearbeitet…" : "Nachfass entwerfen"}
                    </Button>
                  }
                />
              )
            })}
          </div>
        )}
      </Panel>

      <MatchDetail
        match={ausgewaehlt}
        offen={!!ausgewaehlt}
        laufend={ausgewaehlt !== null && laufendId === ausgewaehlt.id}
        onSchliessen={() => setAusgewaehlteId(null)}
        onSenden={() => ausgewaehlt && void senden(ausgewaehlt.id)}
        onVerwerfen={() => ausgewaehlt && void verwerfen(ausgewaehlt.id)}
      />
    </>
  )
}
