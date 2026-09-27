"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ObjektRaster } from "./ObjektRaster"
import { ObjektFormular } from "./ObjektFormular"
import { Drawer } from "@/components/layout/Drawer"
import { Button } from "@/components/ui/Button"
import type { ObjektVorbelegungWerte } from "@/lib/objekt-vorbelegung"
import type { Database } from "@/types/database"

type ObjektRow = Database["public"]["Tables"]["objekte"]["Row"]
export type ObjektVorbelegung = { nachrichtId: string; werte: ObjektVorbelegungWerte }

export function ObjekteAnsicht({
  objekte, treffer, vorbelegung,
}: {
  objekte: ObjektRow[]
  treffer: Record<string, number>
  vorbelegung?: ObjektVorbelegung | null
}) {
  const router = useRouter()
  // ?aus=<Eingangs-id> (Link "Als Objekt übernehmen" im Postfach, Task 7) öffnet das
  // Formular beim ersten Rendern direkt im Neu-Modus -- nur der Startwert, spätere
  // Klicks auf "Objekt anlegen"/eine Karte steuern modus danach ganz normal weiter.
  const [modus, setModus] = useState<string | null>(vorbelegung ? "neu" : null)
  const bearbeitetesObjekt = modus && modus !== "neu" ? objekte.find((o) => o.id === modus) : undefined

  function beiFertig() {
    setModus(null)
    // Verhindert, dass ein Reload nach dem Speichern denselben ?aus=-Link erneut mit
    // den (jetzt schon übernommenen) Werten öffnet.
    if (vorbelegung) router.replace("/admin/objekte")
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button variante="primaer" onClick={() => setModus("neu")}>
          Objekt anlegen
        </Button>
      </div>
      <ObjektRaster objekte={objekte} treffer={treffer} onKarteWahl={setModus} />

      <Drawer
        offen={modus !== null}
        titel={bearbeitetesObjekt ? bearbeitetesObjekt.titel : "Neues Objekt"}
        untertitel=""
        onSchliessen={() => setModus(null)}
      >
        {/*
          key={objekt?.id ?? "neu"} erzwingt einen vollständigen Remount von
          ObjektFormular bei jedem Wechsel (Karte A -> Karte B, oder Karte ->
          "Objekt anlegen"): React unmountet die alte Instanz komplett und
          mountet eine neue mit frischem useState-Initialwert, statt dieselbe
          Instanz mit neuen Props weiterlaufen zu lassen. Das ist dieselbe
          primäre Verteidigung wie bei AnfrageDetail
          (M6) -- ObjektFormular hat zusätzlich einen internen
          useEffect+objektIdRef-Guard (siehe Kommentar dort), der laut
          eigenem Kommentar für den Fall gedacht war, dass diese Seite (wie
          der Plan-Doc-Startcode) OHNE key aufruft und der Drawer damit
          dauerhaft gemountet bliebe. Mit key hier ist dieser interne Guard
          nur noch Defense-in-Depth, nicht mehr die einzige Absicherung.
        */}
        <ObjektFormular
          key={bearbeitetesObjekt?.id ?? "neu"}
          objekt={bearbeitetesObjekt}
          vorbelegung={vorbelegung?.werte}
          herkunftNachrichtId={vorbelegung?.nachrichtId}
          onFertig={beiFertig}
        />
      </Drawer>
    </>
  )
}
