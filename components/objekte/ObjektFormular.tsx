"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { objektAnlegen, objektAktualisieren } from "@/app/actions/objekte"
import type { Database } from "@/types/database"
import type { Nutzung } from "@/types"

type ObjektRow = Database["public"]["Tables"]["objekte"]["Row"]
type ObjektStatus = Database["public"]["Enums"]["objekt_status_enum"]

const NUTZUNGEN: Nutzung[] = ["buero", "gewerbe", "produktion", "lager", "verkauf", "bauland"]
const STATUS_OPTIONEN: { wert: ObjektStatus; label: string }[] = [
  { wert: "verfuegbar", label: "Verfügbar" },
  { wert: "reserviert", label: "Reserviert" },
  { wert: "vermietet", label: "Vermietet" },
]

const LEER = {
  titel: "", adresse: "", ort: "", flaeche: "", preis: "",
  nutzung: "gewerbe" as Nutzung, verfuegbarAb: "", eigentuemer: "", fotoUrl: "",
}

// Bewusst kein Eingabefeld für `eigenschaften` (freies jsonb-Objekt, z.B.
// `{"rampe": true, "kran_tonnen": 16}`, README-Abschnitt "objekte"): Anders als die
// übrigen match-relevanten Felder (Task 55-Review, siehe MATCH_RELEVANTE_FELDER in
// app/actions/objekte.ts) ist das kein einzelner Wert, sondern eine offene
// Schlüssel/Wert-Menge ohne festes Schema -- dafür bräuchte es einen eigenen
// dynamischen Key/Value-Editor (Zeilen hinzufügen/entfernen, Bool- vs. Zahl-Werte
// unterscheiden), keinen einzelnen <input>. Das ist beim analogen Feld auf der
// Anfrage-Seite (`anforderungen`, dieselbe Form) identisch: weder AnfrageFormular
// noch AnfrageDetail bieten dafür ein Feld an. Der DB-Default `'{}'`
// (20260922195257_schema.sql) ist dabei kein Datenverlust-Risiko, sondern der
// neutrale/beste Fall: `punkteAnforderungen` (lib/matching.ts) liefert bei leeren
// `eigenschaften` denselben Score wie bei leeren `anforderungen` -- 100 statt eines
// Fehlschlags --, ein neu angelegtes Objekt ohne Zusatzeigenschaften wird also
// gegenüber Anfragen ohne Zusatzanforderungen nicht benachteiligt. Ein Objekt mit
// echten Zusatzeigenschaften kann heute nur direkt in der DB gepflegt werden; ein
// dedizierter Key/Value-Editor wäre eine eigene, hier bewusst nicht mitgelöste
// Aufgabe.
export function ObjektFormular({ objekt, onFertig }: { objekt?: ObjektRow; onFertig: () => void }) {
  const [titel, setTitel] = useState(objekt?.titel ?? LEER.titel)
  const [adresse, setAdresse] = useState(objekt?.adresse ?? LEER.adresse)
  const [ort, setOrt] = useState(objekt?.ort ?? LEER.ort)
  const [flaeche, setFlaeche] = useState(objekt?.flaeche?.toString() ?? LEER.flaeche)
  const [preis, setPreis] = useState(objekt?.preis_pro_m2?.toString() ?? LEER.preis)
  const [nutzung, setNutzung] = useState<Nutzung>(objekt?.nutzung ?? LEER.nutzung)
  const [verfuegbarAb, setVerfuegbarAb] = useState(objekt?.verfuegbar_ab ?? LEER.verfuegbarAb)
  const [eigentuemer, setEigentuemer] = useState(objekt?.eigentuemer ?? LEER.eigentuemer)
  const [fotoUrl, setFotoUrl] = useState(objekt?.foto_url ?? LEER.fotoUrl)
  // Nur im Bearbeiten-Modus gepflegt (siehe Kommentar bei STATUS_OPTIONEN unten) --
  // beim Anlegen greift der DB-Default 'verfuegbar' (20260922195257_schema.sql).
  const [status, setStatus] = useState<ObjektStatus>(objekt?.status ?? "verfuegbar")
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  // ObjekteAnsicht (Task 58) rendert `<ObjektFormular objekt={bearbeitetesObjekt} .../>`
  // ohne `key` (gleicher Aufrufstil wie AnfrageDetail/EntwurfDetail) -- der Drawer aus
  // Task 58 bleibt beim Schliessen gemountet, und dieselbe Komponenteninstanz bedient
  // sowohl "Objekt anlegen" (objekt === undefined) als auch das Bearbeiten verschiedener
  // Objekte nacheinander. Ohne diesen Reset würde z.B. nach dem Bearbeiten von Objekt A
  // ein direkter Wechsel zu Objekt B (oder zu "neu") weiterhin die Felder von A zeigen,
  // bis die Seite neu geladen wird. objektIdRef hält zusätzlich die aktuell angezeigte
  // Objekt-ID (oder "neu") für absenden() unten, um eine zwischenzeitlich veraltete
  // Antwort einer noch laufenden Speicherung zu erkennen.
  const objektIdRef = useRef(objekt?.id ?? "neu")
  useEffect(() => {
    objektIdRef.current = objekt?.id ?? "neu"
    setTitel(objekt?.titel ?? LEER.titel)
    setAdresse(objekt?.adresse ?? LEER.adresse)
    setOrt(objekt?.ort ?? LEER.ort)
    setFlaeche(objekt?.flaeche?.toString() ?? LEER.flaeche)
    setPreis(objekt?.preis_pro_m2?.toString() ?? LEER.preis)
    setNutzung(objekt?.nutzung ?? LEER.nutzung)
    setVerfuegbarAb(objekt?.verfuegbar_ab ?? LEER.verfuegbarAb)
    setEigentuemer(objekt?.eigentuemer ?? LEER.eigentuemer)
    setFotoUrl(objekt?.foto_url ?? LEER.fotoUrl)
    setStatus(objekt?.status ?? "verfuegbar")
    setFehler(null)
    setSpeichert(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objekt?.id])

  // objektAnlegen/objektAktualisieren (Task 55) werfen bewusst statt Fehler
  // stillschweigend zu verschlucken (Milestone-Konvention, siehe MailEinfuegen/
  // EntwurfDetail/AnfrageDetail/AnfrageFormular). Ohne try/catch würde ein Fehler
  // (z.B. RLS- oder Netzwerkfehler, oder objektAktualisierens expliziter Wurf bei
  // einem RLS-gefilterten Zero-Row-Update) hier zu einer unhandled promise
  // rejection führen und `speichert` bliebe dauerhaft true.
  async function absenden() {
    const zielId = objektIdRef.current
    setSpeichert(true)
    setFehler(null)
    try {
      const werte = {
        titel, adresse, ort,
        flaeche: Number(flaeche),
        preis_pro_m2: preis ? Number(preis) : null,
        nutzung,
        verfuegbar_ab: verfuegbarAb,
        eigentuemer,
        foto_url: fotoUrl || null,
        // status nur beim Bearbeiten mitschicken: beim Anlegen greift der DB-Default,
        // und objektAnlegen kennt ohnehin noch kein Feld dafür in dieser Maske.
        ...(objekt ? { status } : {}),
      }
      if (objekt) {
        await objektAktualisieren(objekt.id, werte)
      } else {
        await objektAnlegen(werte)
        // Formular für die nächste Neuanlage zurücksetzen: siehe Ref-Kommentar oben --
        // ohne Reset stünden beim nächsten "Objekt anlegen" noch die zuletzt
        // eingegebenen Werte da, weil die Komponente gemountet bleibt.
        if (objektIdRef.current === zielId) {
          setTitel(LEER.titel)
          setAdresse(LEER.adresse)
          setOrt(LEER.ort)
          setFlaeche(LEER.flaeche)
          setPreis(LEER.preis)
          setNutzung(LEER.nutzung)
          setVerfuegbarAb(LEER.verfuegbarAb)
          setEigentuemer(LEER.eigentuemer)
          setFotoUrl(LEER.fotoUrl)
        }
      }
      if (objektIdRef.current === zielId) onFertig()
    } catch (e) {
      if (objektIdRef.current === zielId) setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      if (objektIdRef.current === zielId) setSpeichert(false)
    }
  }

  // Anders als bei AnfrageFormular (Anfrage-Felder sind laut Schema nullable, siehe
  // dortiger Kommentar) sind titel/adresse/ort/flaeche/verfuegbar_ab/eigentuemer in
  // der objekte-Basistabelle NOT NULL (20260922195257_schema.sql) -- ein Objekt ohne
  // diese Angaben wäre ein Schemaverstoss, die Pflichtfeld-Validierung bleibt daher
  // (anders als dort) bestehen.
  const gueltig = titel && adresse && ort && flaeche && verfuegbarAb && eigentuemer

  return (
    <div className="flex flex-col gap-2.5 text-sm">
      <input
        placeholder="Titel"
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        disabled={speichert}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
      />
      <input
        placeholder="Adresse"
        value={adresse}
        onChange={(e) => setAdresse(e.target.value)}
        disabled={speichert}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
      />
      <input
        placeholder="Ort"
        value={ort}
        onChange={(e) => setOrt(e.target.value)}
        disabled={speichert}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
      />
      <div className="flex gap-2">
        <input
          placeholder="Fläche m²"
          value={flaeche}
          onChange={(e) => setFlaeche(e.target.value)}
          disabled={speichert}
          className="w-1/2 rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
        />
        <input
          placeholder="Preis CHF/m² (optional)"
          value={preis}
          onChange={(e) => setPreis(e.target.value)}
          disabled={speichert}
          className="w-1/2 rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
        />
      </div>
      <select
        value={nutzung}
        onChange={(e) => setNutzung(e.target.value as Nutzung)}
        disabled={speichert}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
      >
        {NUTZUNGEN.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <input
        type="date"
        value={verfuegbarAb}
        onChange={(e) => setVerfuegbarAb(e.target.value)}
        disabled={speichert}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
      />
      <input
        placeholder="Eigentümer"
        value={eigentuemer}
        onChange={(e) => setEigentuemer(e.target.value)}
        disabled={speichert}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
      />
      <input
        placeholder="Foto-URL (optional)"
        value={fotoUrl}
        onChange={(e) => setFotoUrl(e.target.value)}
        disabled={speichert}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
      />
      {objekt && (
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ObjektStatus)}
          disabled={speichert}
          className="rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
        >
          {STATUS_OPTIONEN.map((s) => (
            <option key={s.wert} value={s.wert}>{s.label}</option>
          ))}
        </select>
      )}
      {fehler && <div className="text-sm text-crit">{fehler}</div>}
      <Button variante="primaer" onClick={absenden} disabled={speichert || !gueltig}>
        {speichert ? "Wird gespeichert…" : objekt ? "Änderungen speichern" : "Objekt anlegen"}
      </Button>
    </div>
  )
}
