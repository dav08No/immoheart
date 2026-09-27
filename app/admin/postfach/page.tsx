import { Header } from "@/components/layout/Header"
import { PostfachAnsicht } from "@/components/postfach/PostfachAnsicht"
import type { AnfrageOption, ObjektOption } from "@/components/postfach/typen"
import { holeEntwuerfe } from "@/lib/queries/nachrichten"
import { holePostfachNachrichten } from "@/lib/queries/postfach"
import { holeAbrufStatus } from "@/lib/queries/eingang"
import { holeAnfragen } from "@/lib/queries/anfragen"
import { holeObjekte } from "@/lib/queries/objekte"
import { anfrageKurz } from "@/lib/eingang/zuordnung"

export default async function PostfachPage() {
  // Entwürfe erscheinen nicht in der Liste (eigene Ansicht /admin/entwuerfe), werden
  // aber gebraucht, um zu einem Eingang den Rückfrage-/Antwort-Entwurf zu öffnen.
  const [nachrichten, entwuerfe, abrufStatus, anfragen, objekte] = await Promise.all([
    holePostfachNachrichten(),
    holeEntwuerfe(),
    holeAbrufStatus(),
    holeAnfragen(),
    holeObjekte(),
  ])
  const entwurfVerweise = entwuerfe.map(({ id, antwort_auf, an, typ }) => ({ id, antwort_auf, an, typ }))
  // Nur Anzeige-Text an den Client, nicht die ganzen Anfrage-Zeilen.
  const anfrageOptionen: AnfrageOption[] = anfragen.map((a) => ({
    id: a.id,
    offen: a.status === "offen",
    label: [a.firma?.name, anfrageKurz(a)].filter(Boolean).join(" · ") || "Anfrage ohne Angaben",
  }))
  const objektOptionen: ObjektOption[] = objekte.map((o) => ({ id: o.id, label: `${o.titel} · ${o.ort}` }))

  return (
    <>
      <Header titel="Postfach" untertitel="Eingang und Gesendet" />
      <main className="flex-1 overflow-y-auto p-5">
        <PostfachAnsicht
          nachrichten={nachrichten}
          entwuerfe={entwurfVerweise}
          abrufStatus={abrufStatus}
          anfragen={anfrageOptionen}
          objekte={objektOptionen}
        />
      </main>
    </>
  )
}
