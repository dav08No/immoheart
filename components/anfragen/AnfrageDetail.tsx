"use client"

import { useEffect, useRef, useState } from "react"
import { Drawer } from "@/components/layout/Drawer"
import { Button } from "@/components/ui/Button"
import { anfrageAktualisieren } from "@/app/actions/anfragen"
import { puls, pulsFarbe } from "@/lib/puls"
import { formatZeitpunkt } from "@/lib/format"
import type { AnfrageMitFirma, VerlaufEintrag } from "@/lib/queries/anfragen"
import type { Kriterium } from "@/types"

type BesterMatch = { score: number; kriterien: Kriterium[]; objekte: { titel: string } | null } | null

const FARBE_KLASSE: Record<ReturnType<typeof pulsFarbe>, string> = {
  gut: "text-good",
  warn: "text-warn",
  kritisch: "text-crit",
}

export function AnfrageDetail({
  anfrage,
  besterMatch,
  verlauf,
  offen,
  sofortBearbeiten,
  onSchliessen,
  onAenderungGespeichert,
}: {
  anfrage: AnfrageMitFirma
  besterMatch: BesterMatch
  verlauf: VerlaufEintrag[]
  offen: boolean
  sofortBearbeiten: boolean
  onSchliessen: () => void
  // Optional, von der noch nicht gebauten AnfragenAnsicht (Task 52) zu verdrahten:
  // wird nach einem erfolgreichen Speichern aufgerufen, damit der Aufrufer
  // besterMatch/verlauf für diese Anfrage neu laden kann (siehe Kommentar bei
  // matchesVeraltet unten). Ohne Handler ändert sich am bisherigen Verhalten nichts.
  onAenderungGespeichert?: () => void
}) {
  // sofortBearbeiten kommt von einem Klick direkt auf eine ?-Lücke in der
  // Tabelle (README-Anforderung) — dann startet der Drawer im Bearbeiten-Modus.
  const [bearbeiten, setBearbeiten] = useState(sofortBearbeiten)
  const [flaecheMin, setFlaecheMin] = useState(anfrage.flaeche_min?.toString() ?? "")
  const [flaecheMax, setFlaecheMax] = useState(anfrage.flaeche_max?.toString() ?? "")
  const [ort, setOrt] = useState(anfrage.ort ?? "")
  const [budget, setBudget] = useState(anfrage.budget_pro_m2?.toString() ?? "")
  const [bezug, setBezug] = useState(anfrage.bezug ?? "")
  const [laufend, setLaufend] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  // Wird nach einem erfolgreichen Speichern gesetzt: anfrageAktualisieren löst bei
  // jedem dieser fünf Felder (siehe MATCH_RELEVANTE_FELDER in app/actions/anfragen.ts)
  // serverseitig ein Rematching aus, aber `besterMatch` ist ein einmalig beim Öffnen
  // geladenes Prop, keine live Subscription. Ohne dieses Flag würde die Bester-Treffer-
  // Sektion nach dem Speichern weiterhin den alten Score/die alten Kriterien als aktuell
  // ausgeben, obwohl sie es nicht mehr sind.
  const [matchesVeraltet, setMatchesVeraltet] = useState(false)

  // AnfragenAnsicht (Task 52, noch nicht gebaut) rendert `<AnfrageDetail anfrage={ausgewaehlt} .../>`
  // voraussichtlich ohne `key={anfrage.id}` (gleicher Aufrufstil wie EntwurfDetail/Task 44).
  // Wechselt die Auswahl in AnfragenTabelle, bekommt dieselbe Komponenteninstanz ein neues
  // `anfrage`-Prop statt neu zu mounten -- ohne Reset würde lokaler Bearbeiten-State (Eingaben,
  // Fehler, laufend) von der vorherigen Anfrage kleben bleiben. anfrageIdRef hält zusätzlich die
  // jeweils aktuell angezeigte Anfrage-ID für die Aktions-Funktion unten, um zu erkennen, ob
  // zwischenzeitlich zu einer anderen Anfrage gewechselt wurde, während speichern() noch lief.
  const anfrageIdRef = useRef(anfrage.id)
  useEffect(() => {
    anfrageIdRef.current = anfrage.id
    setBearbeiten(sofortBearbeiten)
    setFlaecheMin(anfrage.flaeche_min?.toString() ?? "")
    setFlaecheMax(anfrage.flaeche_max?.toString() ?? "")
    setOrt(anfrage.ort ?? "")
    setBudget(anfrage.budget_pro_m2?.toString() ?? "")
    setBezug(anfrage.bezug ?? "")
    setFehler(null)
    setLaufend(false)
    setMatchesVeraltet(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anfrage.id])

  // anfragen_sichtbar ist eine View: PostgREST/supabase-gen typisiert alle Spalten als
  // nullable, obwohl id/letzter_kontakt in der Basistabelle NOT NULL sind (siehe
  // AnfragenTabelle, gleiches Muster). Anders als dort erhält diese Komponente aber eine
  // einzelne Anfrage statt einer Liste -- es gibt keine sinnvolle Möglichkeit, eine Zeile
  // "zu überspringen"; stattdessen zeigt der Drawer eine Fehlermeldung statt abzustürzen.
  // Praktisch sollte das nie eintreten: der einzige heute existierende Aufrufer wählt die
  // ID über AnfragenTabelle aus, die Zeilen mit fehlender id/letzter_kontakt bereits
  // herausfiltert -- dieser Guard ist Verteidigung gegen künftige Aufrufer, nicht ein
  // erwarteter Alltagsfall.
  if (anfrage.id === null || anfrage.letzter_kontakt === null) {
    console.error("AnfrageDetail: Anfrage ohne id oder letzter_kontakt übergeben", anfrage)
    return (
      <Drawer offen={offen} onSchliessen={onSchliessen} titel="Anfrage" untertitel="">
        <p className="text-sm text-crit">Diese Anfrage konnte nicht geladen werden.</p>
      </Drawer>
    )
  }

  const id = anfrage.id
  const letzterKontakt = anfrage.letzter_kontakt
  const wert = puls(new Date(letzterKontakt))
  const tage = Math.floor((Date.now() - new Date(letzterKontakt).getTime()) / 86_400_000)

  // anfrageAktualisieren (Task 48) wirft bewusst statt Fehler stillschweigend zu
  // verschlucken (Milestone-Konvention, siehe MailEinfuegen/EntwurfDetail). Der Aufruf
  // hier läuft deshalb durch try/catch, der Fehler landet sichtbar in `fehler` statt nur
  // in der Konsole zu verschwinden -- sonst bliebe die Nutzerin bei z.B. einem RLS- oder
  // Netzwerkfehler dauerhaft im Bearbeiten-Modus hängen, ohne zu wissen warum.
  async function speichern() {
    const zielId = id
    setLaufend(true)
    setFehler(null)
    try {
      await anfrageAktualisieren(zielId, {
        flaeche_min: flaecheMin ? Number(flaecheMin) : null,
        flaeche_max: flaecheMax ? Number(flaecheMax) : null,
        ort: ort || null,
        budget_pro_m2: budget ? Number(budget) : null,
        bezug: bezug || null,
      })
      if (anfrageIdRef.current === zielId) {
        setBearbeiten(false)
        setMatchesVeraltet(true)
      }
      onAenderungGespeichert?.()
    } catch (e) {
      if (anfrageIdRef.current === zielId) setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      if (anfrageIdRef.current === zielId) setLaufend(false)
    }
  }

  return (
    <Drawer offen={offen} onSchliessen={onSchliessen} titel={anfrage.firma?.name ?? "Anfrage"} untertitel={`seit ${tage} Tagen`}>
      <div>
        <div className="mb-2.5 border-b border-line pb-1.5 text-xs text-ink-3">Daten</div>
        {bearbeiten ? (
          <div className="grid grid-cols-[auto_1fr] items-center gap-2 text-sm">
            <label className="text-xs text-ink-3">Fläche ab</label>
            <input
              value={flaecheMin}
              onChange={(e) => setFlaecheMin(e.target.value)}
              disabled={laufend}
              className="rounded-lg border border-line-2 px-2 py-1 disabled:opacity-60"
            />
            <label className="text-xs text-ink-3">Fläche bis</label>
            <input
              value={flaecheMax}
              onChange={(e) => setFlaecheMax(e.target.value)}
              disabled={laufend}
              className="rounded-lg border border-line-2 px-2 py-1 disabled:opacity-60"
            />
            <label className="text-xs text-ink-3">Ort</label>
            <input
              value={ort}
              onChange={(e) => setOrt(e.target.value)}
              disabled={laufend}
              className="rounded-lg border border-line-2 px-2 py-1 disabled:opacity-60"
              placeholder="fehlt"
            />
            <label className="text-xs text-ink-3">Budget</label>
            <input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              disabled={laufend}
              className="rounded-lg border border-line-2 px-2 py-1 disabled:opacity-60"
              placeholder="fehlt"
            />
            <label className="text-xs text-ink-3">Bezug</label>
            <input
              value={bezug}
              onChange={(e) => setBezug(e.target.value)}
              disabled={laufend}
              className="rounded-lg border border-line-2 px-2 py-1 disabled:opacity-60"
              placeholder="fehlt"
            />
          </div>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-1.5 text-sm">
            <dt className="text-xs text-ink-3">Sucht</dt>
            <dd>
              {anfrage.flaeche_min ?? "?"}–{anfrage.flaeche_max ?? "?"} m²
            </dd>
            <dt className="text-xs text-ink-3">Ort</dt>
            <dd>{anfrage.ort ?? "?"}</dd>
            <dt className="text-xs text-ink-3">Budget</dt>
            <dd>{anfrage.budget_pro_m2 ?? "?"}</dd>
            <dt className="text-xs text-ink-3">Bezug</dt>
            <dd>{anfrage.bezug ?? "?"}</dd>
            <dt className="text-xs text-ink-3">Puls</dt>
            <dd className={`font-semibold ${FARBE_KLASSE[pulsFarbe(wert)]}`}>{wert}</dd>
          </dl>
        )}

        {fehler && <div className="mt-2.5 text-sm text-crit">{fehler}</div>}

        <div className="mt-3 flex gap-2">
          {bearbeiten ? (
            <>
              <Button variante="primaer" onClick={speichern} disabled={laufend}>
                {laufend ? "Wird gespeichert…" : "Speichern"}
              </Button>
              <Button
                onClick={() => {
                  setFlaecheMin(anfrage.flaeche_min?.toString() ?? "")
                  setFlaecheMax(anfrage.flaeche_max?.toString() ?? "")
                  setOrt(anfrage.ort ?? "")
                  setBudget(anfrage.budget_pro_m2?.toString() ?? "")
                  setBezug(anfrage.bezug ?? "")
                  setFehler(null)
                  setBearbeiten(false)
                }}
                disabled={laufend}
              >
                Abbrechen
              </Button>
            </>
          ) : (
            <Button onClick={() => setBearbeiten(true)}>Bearbeiten</Button>
          )}
        </div>
      </div>

      {besterMatch && (
        <div>
          <div className="mb-2.5 border-b border-line pb-1.5 text-xs text-ink-3">
            Bester Treffer · {besterMatch.objekte?.titel ?? "?"}
          </div>
          {matchesVeraltet ? (
            <p className="text-xs text-ink-3">
              Die Angaben wurden geändert, die Treffer werden neu berechnet. Drawer schliessen und erneut öffnen, um den
              aktuellen Treffer zu sehen.
            </p>
          ) : (
            besterMatch.kriterien.map((k) => (
              <div key={k.kriterium} className="mb-1.5 grid grid-cols-[78px_1fr_34px] items-center gap-2.5 text-xs">
                <span>{k.kriterium}</span>
                <span className="h-1.5 overflow-hidden rounded bg-surface-3">
                  <span
                    className={`block h-full ${k.status === "ok" ? "bg-brand" : k.status === "teilweise" ? "bg-warn" : "bg-crit"}`}
                    style={{ width: `${k.status === "ok" ? 100 : k.status === "teilweise" ? 60 : 20}%` }}
                  />
                </span>
                <span className="text-right text-ink-2">{besterMatch.score}</span>
              </div>
            ))
          )}
        </div>
      )}

      <div>
        <div className="mb-2.5 border-b border-line pb-1.5 text-xs text-ink-3">Verlauf</div>
        <ul>
          {verlauf.map((eintrag, i) => (
            <li key={i} className="grid grid-cols-[74px_1fr] gap-2.5 border-b border-line py-1.5 text-xs text-ink-2 last:border-b-0">
              <time className="text-ink-3">{formatZeitpunkt(new Date(eintrag.zeitpunkt))}</time>
              <span>{eintrag.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </Drawer>
  )
}
