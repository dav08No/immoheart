import { SEITEN_INHALT_KLASSE } from "@/components/layout/Seitenkopf"
import { PostfachKopf } from "@/components/postfach/PostfachKopf"
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
  // Anzeige-Text plus die übernehmbaren Feldwerte (für den "unterscheidet sich"-Vergleich
  // in AktionenAntwort) an den Client, nicht die ganzen Anfrage-Zeilen.
  const anfrageOptionen: AnfrageOption[] = anfragen.map((a) => ({
    id: a.id,
    offen: a.status === "offen",
    label: [a.firma?.name, anfrageKurz(a)].filter(Boolean).join(" · ") || "Anfrage ohne Angaben",
    werte: {
      flaeche_min: a.flaeche_min,
      flaeche_max: a.flaeche_max,
      ort: a.ort,
      budget_pro_m2: a.budget_pro_m2,
      bezug: a.bezug,
      nutzung: a.nutzung,
    },
  }))
  const objektOptionen: ObjektOption[] = objekte.map((o) => ({ id: o.id, label: `${o.titel} · ${o.ort}` }))

  return (
    <>
      {/* Client-Komponente: der Abruf-Knopf im Seitenkopf hält Fortschritt und Sperre. */}
      <PostfachKopf abrufStatus={abrufStatus} />
      <main className={SEITEN_INHALT_KLASSE}>
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
