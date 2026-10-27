"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Panel } from "@/components/ui/Panel"
import { Leerzustand } from "@/components/ui/Leerzustand"
import { AbschlussDialog } from "@/components/abschluss/AbschlussDialog"
import { AbschlussRueckmeldung } from "@/components/abschluss/AbschlussRueckmeldung"
import { useAbschlussLauf, type AbschlussErgebnis } from "@/components/abschluss/useAbschlussLauf"
import { anfrageWiederherstellen, objektWiederherstellen } from "@/app/actions/archiv"
import { anfrageEndgueltigLoeschen, archivEintragLoeschen, objektEndgueltigLoeschen } from "@/app/actions/archiv-loeschen"
import { filtereArchiv, jahreMitDaten, SUCHTEXTE, type Zeitraum } from "@/lib/archiv/filter"
import type { ArchivDaten } from "@/lib/archiv/typen"
import { ArchivFilter, type ArchivTab } from "./ArchivFilter"
import { ArchivTabelleTreffer } from "./ArchivTabelleTreffer"
import { ArchivTabelleObjekte } from "./ArchivTabelleObjekte"
import { ArchivTabelleAnfragen } from "./ArchivTabelleAnfragen"
import { EndgueltigLoeschenDialog } from "./EndgueltigLoeschenDialog"
import type { ArchivZiel } from "./typen"

type Vorhaben = { art: "wiederherstellen" | "loeschen"; ziel: ArchivZiel }

const LOESCHEN: Record<ArchivZiel["typ"], (id: string) => Promise<AbschlussErgebnis>> = {
  treffer: archivEintragLoeschen,
  objekt: objektEndgueltigLoeschen,
  anfrage: anfrageEndgueltigLoeschen,
}

function wiederherstellen(ziel: ArchivZiel): Promise<AbschlussErgebnis> {
  if (ziel.typ === "objekt") return objektWiederherstellen(ziel.id)
  if (ziel.typ === "anfrage") return anfrageWiederherstellen(ziel.id)
  // Treffer-Archiveinträge haben keinen Knopf dafür; nur zur Vollständigkeit.
  return Promise.resolve({ fehler: "Treffer lassen sich nicht wiederherstellen." })
}

type Props = { daten: ArchivDaten; istAdmin: boolean; jetzt: string }

export function ArchivAnsicht({ daten, istAdmin, jetzt }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<ArchivTab>("treffer")
  const [zeitraum, setZeitraum] = useState<Zeitraum>("12m")
  const [suche, setSuche] = useState("")
  const [vorhaben, setVorhaben] = useState<Vorhaben | null>(null)
  const [verstanden, setVerstanden] = useState(false)
  // Ein Ablauf für die ganze Seite: solange eine Action läuft, ist jede Zeile gesperrt.
  const lauf = useAbschlussLauf(0, () => router.refresh())

  // Stichtag vom Server, damit Server- und Client-Render dieselben Zeilen zeigen.
  const gefiltert = useMemo(() => {
    const stichtag = new Date(jetzt)
    return {
      treffer: filtereArchiv(daten.treffer, zeitraum, suche, SUCHTEXTE.treffer, stichtag),
      objekte: filtereArchiv(daten.objekte, zeitraum, suche, SUCHTEXTE.objekte, stichtag),
      anfragen: filtereArchiv(daten.anfragen, zeitraum, suche, SUCHTEXTE.anfragen, stichtag),
    }
  }, [daten, zeitraum, suche, jetzt])
  const jahre = useMemo(
    () => jahreMitDaten([...daten.treffer, ...daten.objekte, ...daten.anfragen].map((e) => e.archiviert_am)),
    [daten],
  )

  function oeffne(art: Vorhaben["art"], ziel: ArchivZiel) {
    setVorhaben({ art, ziel })
    setVerstanden(false)
    lauf.oeffneDialog()
  }

  function bestaetigen() {
    if (!vorhaben) return
    const { art, ziel } = vorhaben
    if (art === "wiederherstellen") void lauf.bestaetigen(() => wiederherstellen(ziel), `„${ziel.bezeichnung}“ wiederhergestellt.`)
    else void lauf.bestaetigen(() => LOESCHEN[ziel.typ](ziel.id), `„${ziel.bezeichnung}“ endgültig gelöscht.`)
  }

  const zeile = {
    istAdmin,
    gesperrt: lauf.laufend,
    onWiederherstellen: (ziel: ArchivZiel) => oeffne("wiederherstellen", ziel),
    onLoeschen: (ziel: ArchivZiel) => oeffne("loeschen", ziel),
  }
  const quelle = daten[tab]
  const sichtbar = gefiltert[tab]

  return (
    <Panel as="section" className="flex flex-col gap-4">
      <h2 className="sr-only">Archivierte Einträge</h2>
      <ArchivFilter
        tab={tab}
        anzahl={{ treffer: gefiltert.treffer.length, objekte: gefiltert.objekte.length, anfragen: gefiltert.anfragen.length }}
        zeitraum={zeitraum}
        jahre={jahre}
        suche={suche}
        onTab={setTab}
        onZeitraum={setZeitraum}
        onSuche={setSuche}
      />
      <AbschlussRueckmeldung lauf={lauf} bezeichnung="Archiv" />
      {quelle.length === 0 ? (
        <Leerzustand text="Nichts archiviert." klein />
      ) : sichtbar.length === 0 ? (
        <Leerzustand text="Keine Einträge für diesen Zeitraum oder diese Suche." klein />
      ) : tab === "treffer" ? (
        <ArchivTabelleTreffer treffer={gefiltert.treffer} {...zeile} />
      ) : tab === "objekte" ? (
        <ArchivTabelleObjekte objekte={gefiltert.objekte} {...zeile} />
      ) : (
        <ArchivTabelleAnfragen anfragen={gefiltert.anfragen} {...zeile} />
      )}

      <AbschlussDialog
        offen={lauf.dialogOffen && vorhaben?.art === "wiederherstellen"}
        inhalt={
          vorhaben?.art === "wiederherstellen"
            ? {
                frage: `„${vorhaben.ziel.bezeichnung}“ wiederherstellen?`,
                folgen: "Wird wieder aktiv und erscheint in Listen und Treffersuche.",
                label: "Wiederherstellen",
              }
            : null
        }
        laufend={lauf.laufend}
        onBestaetigen={bestaetigen}
        onAbbrechen={lauf.schliesseDialog}
        onFokusNachSchliessen={lauf.fokusNachSchliessen}
      />
      <EndgueltigLoeschenDialog
        offen={lauf.dialogOffen && vorhaben?.art === "loeschen"}
        ziel={vorhaben?.art === "loeschen" ? vorhaben.ziel : null}
        verstanden={verstanden}
        laufend={lauf.laufend}
        onVerstanden={setVerstanden}
        onBestaetigen={bestaetigen}
        onAbbrechen={lauf.schliesseDialog}
        onFokusNachSchliessen={lauf.fokusNachSchliessen}
      />
    </Panel>
  )
}
