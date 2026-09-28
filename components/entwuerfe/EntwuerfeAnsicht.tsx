"use client"

import { useEffect, useState } from "react"
import { EntwurfListe } from "./EntwurfListe"
import { EntwurfEditor } from "./EntwurfEditor"
import { useListeDetail } from "@/components/layout/useListeDetail"
import { ZurueckZurListe } from "@/components/layout/ZurueckZurListe"
import { Panel } from "@/components/ui/Panel"
import { Leerzustand } from "@/components/ui/Leerzustand"
import type { EntwurfMitBezug } from "@/lib/queries/nachrichten"

// "Neue Mail" lebt jetzt in EntwuerfeKopf (Seitenkopf-Hauptaktion) statt hier --
// diese Komponente zeigt nur noch Liste und Editor, wie PostfachAnsicht.
export function EntwuerfeAnsicht({ entwuerfe, startId }: { entwuerfe: EntwurfMitBezug[]; startId: string | null }) {
  const [ausgewaehlteId, setAusgewaehlteId] = useState(startId ?? entwuerfe[0]?.id ?? null)
  const { listeRef, detailRef, zumDetail, zurListe } = useListeDetail()

  // NeueMailDialog navigiert nach dem Anlegen per router.push auf
  // /admin/entwuerfe?id=<neue-id>. Die Seite (Server Component) liefert dabei
  // ein neues startId-Prop -- ohne diesen Effekt bliebe die (interne, per
  // useState nur EINMAL initialisierte) Auswahl auf dem zuvor gewählten
  // Entwurf stehen, obwohl die URL bereits auf den neuen zeigt.
  // Kommt man mit ?id= (z.B. "Entwurf öffnen" im Postfach), ist der Entwurf das
  // Ziel -- auf dem Handy deshalb gleich zum Editor unter der Liste springen.
  useEffect(() => {
    if (!startId) return
    setAusgewaehlteId(startId)
    zumDetail()
  }, [startId, zumDetail])

  // Nach Senden/Löschen liefert revalidatePath eine aktualisierte Liste ohne
  // den verarbeiteten Entwurf. Die bisherige Auswahl existiert dann nicht mehr
  // -- statt auf "Kein Entwurf ausgewählt" zu fallen, wird auf den nächsten
  // (jetzt ersten) Entwurf der Liste gewechselt, solange noch welche offen sind.
  useEffect(() => {
    if (ausgewaehlteId && !entwuerfe.some((entwurf) => entwurf.id === ausgewaehlteId)) {
      setAusgewaehlteId(entwuerfe[0]?.id ?? null)
    }
  }, [entwuerfe, ausgewaehlteId])

  const ausgewaehlt = entwuerfe.find((entwurf) => entwurf.id === ausgewaehlteId) ?? null

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <div ref={listeRef} className="min-w-0 scroll-mt-3">
        <Panel as="section" polster={false}>
          <h2 className="sr-only">Entwürfe</h2>
          <EntwurfListe
            entwuerfe={entwuerfe}
            ausgewaehlteId={ausgewaehlteId}
            onAuswahl={(id) => {
              setAusgewaehlteId(id)
              zumDetail()
            }}
          />
        </Panel>
      </div>
      <div ref={detailRef} className="min-w-0 scroll-mt-3">
        <Panel polster={false} className="flex flex-col overflow-hidden">
          <ZurueckZurListe onKlick={zurListe} />
          {!ausgewaehlt && (
            <Leerzustand text={entwuerfe.length === 0 ? "Keine offenen Entwürfe." : "Kein Entwurf ausgewählt."} />
          )}
          {ausgewaehlt && <EntwurfEditor key={ausgewaehlt.id} entwurf={ausgewaehlt} />}
        </Panel>
      </div>
    </div>
  )
}
