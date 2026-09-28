"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { BeschreibungFeld, SelectFeld, SichtbarkeitFeld, TextFeld } from "./ObjektFelder"
import { ObjektFotos } from "./ObjektFotos"
import { objektAnlegen, objektAktualisieren } from "@/app/actions/objekte"
import type { ObjektVorbelegungWerte } from "@/lib/objekt-vorbelegung"
import type { Database } from "@/types/database"
import { NUTZUNGEN as NUTZUNG_WERTE } from "@/lib/nutzung"
import type { Nutzung } from "@/types"

type ObjektRow = Database["public"]["Tables"]["objekte"]["Row"]
type ObjektStatus = Database["public"]["Enums"]["objekt_status_enum"]

const NUTZUNGEN: { wert: Nutzung; label: string }[] = NUTZUNG_WERTE.map((n) => ({ wert: n, label: n }))
const STATUS_OPTIONEN: { wert: ObjektStatus; label: string }[] = [
  { wert: "verfuegbar", label: "Verfügbar" },
  { wert: "reserviert", label: "Reserviert" },
  { wert: "vermietet", label: "Vermietet" },
]

type Werte = {
  titel: string; adresse: string; ort: string; flaeche: string; preis: string
  nutzung: Nutzung; verfuegbarAb: string; eigentuemer: string; beschreibung: string; oeffentlich: boolean
}

const LEER: Werte = {
  titel: "", adresse: "", ort: "", flaeche: "", preis: "",
  nutzung: "gewerbe", verfuegbarAb: "", eigentuemer: "", beschreibung: "", oeffentlich: true,
}

// objekt (Bearbeiten) schlägt vorbelegung (aus einer Mail übernommen, Task 7) schlägt
// LEER -- bei objekt greift vorbelegung faktisch nie (NOT-NULL-Felder), der Vollständigkeit halber trotzdem mit derselben Priorität.
function startwerte(objekt: ObjektRow | undefined, vorbelegung: ObjektVorbelegungWerte | undefined): Werte {
  return {
    titel: objekt?.titel ?? vorbelegung?.titel ?? LEER.titel,
    adresse: objekt?.adresse ?? vorbelegung?.adresse ?? LEER.adresse,
    ort: objekt?.ort ?? vorbelegung?.ort ?? LEER.ort,
    flaeche: objekt?.flaeche?.toString() ?? vorbelegung?.flaeche ?? LEER.flaeche,
    preis: objekt?.preis_pro_m2?.toString() ?? vorbelegung?.preis ?? LEER.preis,
    nutzung: objekt?.nutzung ?? vorbelegung?.nutzung ?? LEER.nutzung,
    verfuegbarAb: objekt?.verfuegbar_ab ?? vorbelegung?.verfuegbarAb ?? LEER.verfuegbarAb,
    eigentuemer: objekt?.eigentuemer ?? vorbelegung?.eigentuemer ?? LEER.eigentuemer,
    beschreibung: objekt?.beschreibung ?? LEER.beschreibung,
    oeffentlich: objekt?.oeffentlich ?? LEER.oeffentlich,
  }
}

// Kein Eingabefeld für `eigenschaften` (freies jsonb-Objekt, kein fester Schlüssel/Wert-
// Satz für ein einzelnes <input>) -- bräuchte einen eigenen Key/Value-Editor, analog zu
// `anforderungen` bei Anfragen, dort ebenfalls ohne Feld. DB-Default `'{}'` bewertet
// laut punkteAnforderungen (lib/matching.ts) wie leere `anforderungen`, kein Nachteil.
export function ObjektFormular({
  objekt, vorbelegung, herkunftNachrichtId, onFertig,
}: {
  objekt?: ObjektRow
  vorbelegung?: ObjektVorbelegungWerte
  herkunftNachrichtId?: string
  onFertig: () => void
}) {
  const start = startwerte(objekt, vorbelegung)
  const [titel, setTitel] = useState(start.titel)
  const [adresse, setAdresse] = useState(start.adresse)
  const [ort, setOrt] = useState(start.ort)
  const [flaeche, setFlaeche] = useState(start.flaeche)
  const [preis, setPreis] = useState(start.preis)
  const [nutzung, setNutzung] = useState<Nutzung>(start.nutzung)
  const [verfuegbarAb, setVerfuegbarAb] = useState(start.verfuegbarAb)
  const [eigentuemer, setEigentuemer] = useState(start.eigentuemer)
  const [beschreibung, setBeschreibung] = useState(start.beschreibung)
  const [oeffentlich, setOeffentlich] = useState(start.oeffentlich)
  // Nur im Bearbeiten-Modus gepflegt -- beim Anlegen greift der DB-Default 'verfuegbar'.
  const [status, setStatus] = useState<ObjektStatus>(objekt?.status ?? "verfuegbar")
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  function setzeFelder(w: Werte) {
    setTitel(w.titel); setAdresse(w.adresse); setOrt(w.ort); setFlaeche(w.flaeche)
    setPreis(w.preis); setNutzung(w.nutzung); setVerfuegbarAb(w.verfuegbarAb)
    setEigentuemer(w.eigentuemer); setBeschreibung(w.beschreibung); setOeffentlich(w.oeffentlich)
  }

  // Fallback-Reset, falls diese Komponente je ohne key-Wechsel weiterläuft (siehe
  // objektIdRef unten) -- primäre Absicherung ist der key im Elternteil (ObjekteAnsicht).
  const objektIdRef = useRef(objekt?.id ?? "neu")
  useEffect(() => {
    objektIdRef.current = objekt?.id ?? "neu"
    setzeFelder(startwerte(objekt, vorbelegung))
    setStatus(objekt?.status ?? "verfuegbar")
    setFehler(null)
    setSpeichert(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objekt?.id])

  // objektAnlegen/objektAktualisieren werfen bewusst (Milestone-Konvention) -- ohne
  // try/catch bliebe `speichert` bei einem Fehler dauerhaft true.
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
        // foto_url wird nicht mehr gepflegt, bleibt aber als Fallback-Titelbild stehen.
        beschreibung: beschreibung.trim() || null,
        oeffentlich,
        ...(objekt ? { status } : {}),
      }
      if (objekt) {
        await objektAktualisieren(objekt.id, werte)
      } else {
        await objektAnlegen(werte, herkunftNachrichtId)
        // Zurücksetzen, sonst stünden beim nächsten "Objekt anlegen" noch die zuletzt
        // eingegebenen (oder vorbelegten) Werte da -- die Komponente bleibt gemountet.
        if (objektIdRef.current === zielId) setzeFelder(LEER)
      }
      if (objektIdRef.current === zielId) onFertig()
    } catch (e) {
      if (objektIdRef.current === zielId) setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      if (objektIdRef.current === zielId) setSpeichert(false)
    }
  }

  // titel/adresse/ort/flaeche/verfuegbar_ab/eigentuemer sind NOT NULL (anders als bei
  // Anfragen) -- die Pflichtfeld-Validierung bleibt daher bestehen.
  const gueltig = titel && adresse && ort && flaeche && verfuegbarAb && eigentuemer

  return (
    <div className="flex flex-col gap-2.5 text-sm">
      {!objekt && vorbelegung && (
        <p className="rounded-lg bg-brand-soft px-2.5 py-1.5 text-xs text-ink-2">
          Vorbelegt aus Mail von {vorbelegung.eigentuemer}.
        </p>
      )}
      <TextFeld placeholder="Titel" wert={titel} setWert={setTitel} disabled={speichert} />
      <TextFeld placeholder="Adresse" wert={adresse} setWert={setAdresse} disabled={speichert} />
      <TextFeld placeholder="Ort" wert={ort} setWert={setOrt} disabled={speichert} />
      <div className="flex gap-2">
        <TextFeld placeholder="Fläche m²" wert={flaeche} setWert={setFlaeche} disabled={speichert} halb />
        <TextFeld placeholder="Preis CHF/m² (optional)" wert={preis} setWert={setPreis} disabled={speichert} halb />
      </div>
      <SelectFeld wert={nutzung} setWert={setNutzung} optionen={NUTZUNGEN} disabled={speichert} />
      <input
        type="date"
        value={verfuegbarAb}
        onChange={(e) => setVerfuegbarAb(e.target.value)}
        disabled={speichert}
        className="rounded-lg border border-line-2 px-2.5 py-1.5 disabled:opacity-60"
      />
      <TextFeld placeholder="Eigentümer" wert={eigentuemer} setWert={setEigentuemer} disabled={speichert} />
      <BeschreibungFeld wert={beschreibung} setWert={setBeschreibung} disabled={speichert} />
      <SichtbarkeitFeld wert={oeffentlich} setWert={setOeffentlich} disabled={speichert} />
      {objekt && (
        <SelectFeld wert={status} setWert={setStatus} optionen={STATUS_OPTIONEN} disabled={speichert} />
      )}
      {fehler && <div className="text-sm text-crit">{fehler}</div>}
      <Button variante="primaer" onClick={absenden} disabled={speichert || !gueltig}>
        {speichert ? "Wird gespeichert…" : objekt ? "Änderungen speichern" : "Objekt anlegen"}
      </Button>
      {objekt ? (
        <ObjektFotos objektId={objekt.id} />
      ) : (
        <p className="border-t border-line pt-3 text-xs text-ink-3">Fotos nach dem Speichern hinzufügen.</p>
      )}
    </div>
  )
}
