"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { ObjektRaster, STATUS_LABEL } from "./ObjektRaster"
import { ObjektFormular } from "./ObjektFormular"
import { ObjektInteressenten } from "./ObjektInteressenten"
import { Drawer } from "@/components/layout/Drawer"
import { Seitenkopf, SEITEN_INHALT_KLASSE } from "@/components/layout/Seitenkopf"
import { Button } from "@/components/ui/Button"
import { Panel } from "@/components/ui/Panel"
import { Leerzustand } from "@/components/ui/Leerzustand"
import { StatusChip } from "@/components/ui/StatusChip"
import { kontextObjekte } from "@/lib/admin/kontext"
import { objektStatusTon } from "@/lib/ui/status-ton"
import type { ObjektVorbelegungWerte } from "@/lib/objekt-vorbelegung"
import type { Database } from "@/types/database"

type ObjektRow = Database["public"]["Tables"]["objekte"]["Row"]
export type ObjektVorbelegung = { nachrichtId: string; werte: ObjektVorbelegungWerte }

export function ObjekteAnsicht({
  objekte, treffer, titelbilder, direktanfragen, vorbelegung, oeffnenId,
}: {
  objekte: ObjektRow[]
  treffer: Record<string, number>
  titelbilder: Record<string, string>
  direktanfragen: Record<string, number>
  vorbelegung?: ObjektVorbelegung | null
  oeffnenId?: string | null
}) {
  const router = useRouter()
  // ?aus=<Eingangs-id> (Link "Als Objekt übernehmen" im Postfach, Task 7) öffnet das
  // Formular beim ersten Rendern direkt im Neu-Modus -- nur der Startwert, spätere
  // Klicks auf "Objekt anlegen"/eine Karte steuern modus danach ganz normal weiter.
  // ?id=<Objekt-id> (Links aus dem Postfach) öffnet dieses Objekt direkt.
  const [modus, setModus] = useState<string | null>(vorbelegung ? "neu" : (oeffnenId ?? null))
  const bearbeitetesObjekt = modus && modus !== "neu" ? objekte.find((o) => o.id === modus) : undefined

  // Nach Speichern UND nach Abbrechen ?aus= entfernen: sonst öffnet ein Reload den
  // Link erneut, und jedes spätere "Objekt anlegen" wäre noch mit der Mail vorbelegt
  // und würde sie still verknüpfen (Final-Review I5).
  function schliessen() {
    setModus(null)
    if (vorbelegung || oeffnenId) router.replace("/admin/objekte")
  }

  // "öffentlich" wie die View objekte_oeffentlich: Schalter an UND verfügbar/reserviert.
  const oeffentlich = objekte.filter((o) => o.oeffentlich && o.status !== "vermietet").length
  const symbol = <Plus className="size-4" aria-hidden />

  return (
    <>
      <Seitenkopf
        titel="Objekte"
        kontext={kontextObjekte(objekte.length, oeffentlich)}
        aktion={
          <Button variante="primaer" icon={symbol} onClick={() => setModus("neu")}>
            Objekt anlegen
          </Button>
        }
        aktionMobil={
          <Button variante="primaer" className="size-10 px-0" aria-label="Objekt anlegen" icon={symbol} onClick={() => setModus("neu")} />
        }
      />
      <main className={SEITEN_INHALT_KLASSE}>
        {objekte.length === 0 ? (
          <Panel>
            <Leerzustand text="Noch keine Objekte im Bestand." />
          </Panel>
        ) : (
          <ObjektRaster
            objekte={objekte}
            treffer={treffer}
            titelbilder={titelbilder}
            direktanfragen={direktanfragen}
            onKarteWahl={setModus}
          />
        )}
      </main>

      <Drawer
        offen={modus !== null}
        titel={bearbeitetesObjekt ? bearbeitetesObjekt.titel : "Neues Objekt"}
        untertitel=""
        chip={
          bearbeitetesObjekt && (
            <StatusChip ton={objektStatusTon(bearbeitetesObjekt.status)}>{STATUS_LABEL[bearbeitetesObjekt.status]}</StatusChip>
          )
        }
        onSchliessen={schliessen}
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
        {/* Status nur über Aktionen: Interessenten und Objekt-Aktionen vor dem Formular. */}
        {bearbeitetesObjekt && (
          <ObjektInteressenten key={bearbeitetesObjekt.id} objektId={bearbeitetesObjekt.id} titel={bearbeitetesObjekt.titel} />
        )}
        <ObjektFormular
          key={bearbeitetesObjekt?.id ?? "neu"}
          objekt={bearbeitetesObjekt}
          vorbelegung={vorbelegung?.werte}
          herkunftNachrichtId={vorbelegung?.nachrichtId}
          onFertig={schliessen}
        />
      </Drawer>
    </>
  )
}
