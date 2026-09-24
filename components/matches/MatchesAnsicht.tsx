"use client"

import { useState } from "react"
import { PulsHero } from "./PulsHero"
import { MatchCard } from "./MatchCard"
import { MatchDetail } from "./MatchDetail"
import { matchSenden, matchVerwerfen, anfrageNachfragen } from "@/app/actions/matches"
import { puls } from "@/lib/puls"
import type { NeuerMatch } from "@/lib/queries/matches"
import type { AnfrageMitFirma } from "@/lib/queries/anfragen"

export function MatchesAnsicht({
  matches, letzteKontakte, offeneAnzahl, objektAnzahl, langeStillAnfragen,
}: {
  matches: NeuerMatch[]
  letzteKontakte: Date[]
  offeneAnzahl: number
  objektAnzahl: number
  langeStillAnfragen: AnfrageMitFirma[]
}) {
  const [ausgewaehlteId, setAusgewaehlteId] = useState<string | null>(null)
  const ausgewaehlt = matches.find((m) => m.id === ausgewaehlteId) ?? null
  const langeStillAnzahl = letzteKontakte.filter((d) => puls(d) < 25).length

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
    setAusgewaehlteId(null)
    setFehler(null)
    try {
      await matchSenden(id)
    } catch (e) {
      const objekt = matches.find((m) => m.id === id)?.objekt.titel ?? "dieses Match"
      setFehler(`Angebot senden fehlgeschlagen (${objekt}): ${fehlertext(e)}`)
    }
  }
  async function verwerfen(id: string) {
    setAusgewaehlteId(null)
    setFehler(null)
    try {
      await matchVerwerfen(id)
    } catch (e) {
      const objekt = matches.find((m) => m.id === id)?.objekt.titel ?? "dieses Match"
      setFehler(`Verwerfen fehlgeschlagen (${objekt}): ${fehlertext(e)}`)
    }
  }
  async function nachfragen(id: string, wer: string) {
    setFehler(null)
    try {
      await anfrageNachfragen(id)
    } catch (e) {
      setFehler(`Nachfragen fehlgeschlagen (${wer}): ${fehlertext(e)}`)
    }
  }

  return (
    <>
      <PulsHero letzteKontakte={letzteKontakte} />

      {fehler && (
        <div className="my-3 rounded-lg border border-crit/30 bg-crit/5 px-3 py-2 text-xs text-crit">
          {fehler}
        </div>
      )}

      <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <div className="rounded-card border-y border-r border-l-[3px] border-line border-l-brand bg-surface p-3.5">
          <div className="text-xs text-ink-3">Neue Matches</div>
          <div className="font-display text-2xl font-bold text-ink">{matches.length}</div>
        </div>
        <div className="rounded-card border border-line bg-surface p-3.5">
          <div className="text-xs text-ink-3">Offene Anfragen</div>
          <div className="font-display text-2xl font-bold text-ink">{offeneAnzahl}</div>
        </div>
        <div className="rounded-card border border-line bg-surface p-3.5">
          <div className="text-xs text-ink-3">Objekte</div>
          <div className="font-display text-2xl font-bold text-ink">{objektAnzahl}</div>
        </div>
        <div className="rounded-card border-y border-r border-l-[3px] border-line border-l-warn bg-surface p-3.5">
          <div className="text-xs text-ink-3">Lange still</div>
          <div className="font-display text-2xl font-bold text-ink">{langeStillAnzahl}</div>
        </div>
      </div>

      <div className="mb-2.5 flex items-baseline gap-2.5">
        <h2 className="font-display text-base font-bold text-ink">Neue Matches</h2>
        <span className="ml-auto text-xs text-ink-3">{matches.length} Vorschläge</span>
      </div>
      <div className="flex flex-col gap-3">
        {matches.length === 0 && (
          <div className="rounded-card border border-line bg-surface p-8 text-center text-sm text-ink-3">
            Keine offenen Matches.
          </div>
        )}
        {matches.map((m) => (
          <MatchCard
            key={m.id} match={m}
            onOeffnen={() => setAusgewaehlteId(m.id)}
            onSenden={() => void senden(m.id)}
            onVerwerfen={() => void verwerfen(m.id)}
          />
        ))}
      </div>

      <div className="mt-4 rounded-card border border-line bg-surface">
        <div className="flex items-center gap-2.5 border-b border-line p-3.5">
          <h2 className="font-display text-base font-bold text-ink">Lange nichts gehört</h2>
          <span className="ml-auto text-xs text-ink-3">{langeStillAnfragen.length} Anfragen</span>
        </div>
        {langeStillAnfragen.map((a) => {
          // anfragen_sichtbar ist eine View: id/letzter_kontakt sind laut generiertem
          // Typ nullable, obwohl in der Basistabelle NOT NULL (gleiches Muster wie
          // AnfragenTabelle.tsx/holeNeueMatches). Praktisch unerreichbar; defensiv
          // überspringen statt wegzucasten, mit Log statt stillem Verschwinden.
          if (a.id === null || a.letzter_kontakt === null) {
            console.error("MatchesAnsicht: Anfrage ohne id oder letzter_kontakt übersprungen", a)
            return null
          }
          const id = a.id
          const wer = a.firma?.name ?? (a.vertraulich ? "vertraulich" : "diese Anfrage")
          const tage = Math.floor((Date.now() - new Date(a.letzter_kontakt).getTime()) / 86_400_000)
          return (
            <div key={id} className="flex items-center gap-3 border-b border-line p-3 last:border-b-0">
              <span className={`h-2 w-2 rounded-full ${tage > 60 ? "bg-crit" : "bg-warn"}`} />
              <div>
                <div className="text-sm font-medium text-ink">
                  {a.firma?.name ?? (a.vertraulich ? "vertraulich" : "?")}
                </div>
                <div className="text-xs text-ink-3">
                  {a.flaeche_min ?? "?"}–{a.flaeche_max ?? "?"} m² · {a.ort ?? "?"}
                </div>
              </div>
              <span className="ml-auto text-xs text-ink-2">{tage} Tage</span>
              <button
                onClick={() => void nachfragen(id, wer)}
                className="rounded-lg border border-line-2 px-2.5 py-1 text-xs text-ink hover:bg-surface-2"
              >
                Nachfragen
              </button>
            </div>
          )
        })}
      </div>

      <MatchDetail
        match={ausgewaehlt}
        offen={!!ausgewaehlt}
        onSchliessen={() => setAusgewaehlteId(null)}
        onSenden={() => ausgewaehlt && void senden(ausgewaehlt.id)}
        onVerwerfen={() => ausgewaehlt && void verwerfen(ausgewaehlt.id)}
      />
    </>
  )
}
