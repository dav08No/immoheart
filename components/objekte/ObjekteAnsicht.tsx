"use client"

import { useState } from "react"
import { ObjektRaster } from "./ObjektRaster"
import { ObjektFormular } from "./ObjektFormular"
import { Drawer } from "@/components/layout/Drawer"
import { Button } from "@/components/ui/Button"
import type { Database } from "@/types/database"

type ObjektRow = Database["public"]["Tables"]["objekte"]["Row"]

export function ObjekteAnsicht({
  objekte, treffer,
}: {
  objekte: ObjektRow[]
  treffer: Record<string, number>
}) {
  const [modus, setModus] = useState<string | null>(null)
  const bearbeitetesObjekt = modus && modus !== "neu" ? objekte.find((o) => o.id === modus) : undefined

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
          primäre Verteidigung wie bei EntwurfDetail (M5) und AnfrageDetail
          (M6) -- ObjektFormular hat zusätzlich einen internen
          useEffect+objektIdRef-Guard (siehe Kommentar dort), der laut
          eigenem Kommentar für den Fall gedacht war, dass diese Seite (wie
          der Plan-Doc-Startcode) OHNE key aufruft und der Drawer damit
          dauerhaft gemountet bliebe. Mit key hier ist dieser interne Guard
          nur noch Defense-in-Depth, nicht mehr die einzige Absicherung.
        */}
        <ObjektFormular key={bearbeitetesObjekt?.id ?? "neu"} objekt={bearbeitetesObjekt} onFertig={() => setModus(null)} />
      </Drawer>
    </>
  )
}
