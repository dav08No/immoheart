"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Abschnittstitel } from "@/components/ui/Abschnittstitel"
import { DrawerLeiste } from "@/components/layout/DrawerLeiste"
import { BeschreibungFeld, EigentuemerEmailFeld, SelectFeld, SichtbarkeitFeld, TextFeld } from "./ObjektFelder"
import { ObjektFotos } from "./ObjektFotos"
import { objektAnlegen, objektAktualisieren } from "@/app/actions/objekte"
import type { ObjektVorbelegungWerte } from "@/lib/objekt-vorbelegung"
import type { Database } from "@/types/database"
import { NUTZUNGEN as NUTZUNG_WERTE } from "@/lib/nutzung"
import type { Nutzung } from "@/types"

type ObjektRow = Database["public"]["Tables"]["objekte"]["Row"]

const NUTZUNGEN: { wert: Nutzung; label: string }[] = NUTZUNG_WERTE.map((n) => ({ wert: n, label: n }))

type Werte = {
  titel: string; adresse: string; ort: string; flaeche: string; preis: string
  nutzung: Nutzung; verfuegbarAb: string; eigentuemer: string; eigentuemerEmail: string; beschreibung: string; oeffentlich: boolean
}

const LEER: Werte = {
  titel: "", adresse: "", ort: "", flaeche: "", preis: "",
  nutzung: "gewerbe", verfuegbarAb: "", eigentuemer: "", eigentuemerEmail: "", beschreibung: "", oeffentlich: true,
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
    eigentuemerEmail: objekt?.eigentuemer_email ?? LEER.eigentuemerEmail,
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
  const [eigentuemerEmail, setEigentuemerEmail] = useState(start.eigentuemerEmail)
  const [beschreibung, setBeschreibung] = useState(start.beschreibung)
  const [oeffentlich, setOeffentlich] = useState(start.oeffentlich)
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  function setzeFelder(w: Werte) {
    setTitel(w.titel); setAdresse(w.adresse); setOrt(w.ort); setFlaeche(w.flaeche)
    setPreis(w.preis); setNutzung(w.nutzung); setVerfuegbarAb(w.verfuegbarAb)
    setEigentuemer(w.eigentuemer); setEigentuemerEmail(w.eigentuemerEmail); setBeschreibung(w.beschreibung); setOeffentlich(w.oeffentlich)
  }

  // Fallback-Reset, falls diese Komponente je ohne key-Wechsel weiterläuft (siehe
  // objektIdRef unten) -- primäre Absicherung ist der key im Elternteil (ObjekteAnsicht).
  const objektIdRef = useRef(objekt?.id ?? "neu")
  useEffect(() => {
    objektIdRef.current = objekt?.id ?? "neu"
    setzeFelder(startwerte(objekt, vorbelegung))
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
        // Leer → null (auch serverseitig); beim Anlegen aus einer Mail übernimmt die Action den Absender.
        eigentuemer_email: eigentuemerEmail.trim() || null,
        // foto_url wird nicht mehr gepflegt, bleibt aber als Fallback-Titelbild stehen.
        beschreibung: beschreibung.trim() || null,
        // Kein status: der wechselt nur über die Abschluss-Aktionen im Panel (Spec §3).
        oeffentlich,
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

  // Abschnitte Eckdaten, Beschreibung, Sichtbarkeit, Fotos; Speichern in der
  // sticky Leiste am Ende (Fotos speichern ohnehin sofort, siehe ObjektFotos).
  return (
    <div className="flex flex-1 flex-col gap-6">
      {!objekt && vorbelegung && (
        <p className="rounded-lg bg-brand-soft px-3 py-2 text-xs text-ink-2 wrap-anywhere">
          Vorbelegt aus Mail von {vorbelegung.eigentuemer}.
        </p>
      )}
      <section className="flex flex-col gap-3">
        <Abschnittstitel>Eckdaten</Abschnittstitel>
        <TextFeld label="Titel" wert={titel} setWert={setTitel} disabled={speichert} />
        <TextFeld label="Adresse" wert={adresse} setWert={setAdresse} disabled={speichert} />
        <TextFeld label="Ort" wert={ort} setWert={setOrt} disabled={speichert} />
        <div className="grid grid-cols-2 gap-3">
          <TextFeld label="Fläche m²" wert={flaeche} setWert={setFlaeche} disabled={speichert} />
          <TextFeld label="Preis CHF/m² (optional)" wert={preis} setWert={setPreis} disabled={speichert} />
        </div>
        <SelectFeld label="Nutzung" wert={nutzung} setWert={setNutzung} optionen={NUTZUNGEN} disabled={speichert} />
        <TextFeld label="Verfügbar ab" typ="date" wert={verfuegbarAb} setWert={setVerfuegbarAb} disabled={speichert} />
        <TextFeld label="Eigentümer" wert={eigentuemer} setWert={setEigentuemer} disabled={speichert} />
        <EigentuemerEmailFeld wert={eigentuemerEmail} setWert={setEigentuemerEmail} disabled={speichert} />
      </section>
      <section className="flex flex-col gap-3">
        {/* "Text" statt "Beschreibung": das Feld darunter heisst schon so (keine Doppelung). */}
        <Abschnittstitel>Text</Abschnittstitel>
        <BeschreibungFeld wert={beschreibung} setWert={setBeschreibung} disabled={speichert} />
      </section>
      <section className="flex flex-col gap-3">
        <Abschnittstitel>Sichtbarkeit</Abschnittstitel>
        <SichtbarkeitFeld wert={oeffentlich} setWert={setOeffentlich} disabled={speichert} />
      </section>
      {objekt ? (
        <ObjektFotos objektId={objekt.id} />
      ) : (
        <section className="flex flex-col gap-2">
          <Abschnittstitel>Fotos</Abschnittstitel>
          <p className="text-xs text-ink-2">Fotos nach dem Speichern hinzufügen.</p>
        </section>
      )}
      <DrawerLeiste>
        {/* Fehler in der Leiste, damit er neben dem Knopf sichtbar ist, egal wohin gescrollt wurde. */}
        {fehler && (
          <p role="alert" className="mr-auto min-w-0 basis-full text-sm text-crit wrap-break-word">
            {fehler}
          </p>
        )}
        <Button variante="primaer" onClick={absenden} disabled={speichert || !gueltig}>
          {speichert ? "Wird gespeichert…" : objekt ? "Änderungen speichern" : "Objekt anlegen"}
        </Button>
      </DrawerLeiste>
    </div>
  )
}
