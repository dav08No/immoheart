import { Seitenkopf, SEITEN_INHALT_KLASSE } from "@/components/layout/Seitenkopf"
import { MatchesAnsicht } from "@/components/matches/MatchesAnsicht"
import { holeNeueMatches, type NeuerMatch } from "@/lib/queries/matches"
import { holeOffenePulsWerte, holeAnfragen } from "@/lib/queries/anfragen"
import { holeObjekte } from "@/lib/queries/objekte"
import { kontextMatches } from "@/lib/admin/kontext"
import { puls } from "@/lib/puls"

export default async function MatchesPage() {
  const [matches, letzteKontakte, anfragen, objekte] = await Promise.all([
    holeNeueMatches(),
    holeOffenePulsWerte(),
    holeAnfragen(),
    holeObjekte(),
  ])
  // holeAnfragen (lib/queries/anfragen.ts) sortiert bereits nach letzter_kontakt
  // aufsteigend (älteste zuerst) -- die ersten drei offenen Treffer nach dem
  // Filter sind damit tatsächlich die drei am längsten unkontaktierten offenen
  // Anfragen, nicht willkürliche oder die jüngsten drei.
  const offeneAnfragen = anfragen.filter((a) => a.status === "offen")
  const langeStillAnfragen = offeneAnfragen.slice(0, 3)

  const offeneAnzahl = offeneAnfragen.length
  // Reservierte Objekte warten auf "Vertrag unterschrieben" oder Aufheben (Spec §3).
  const reserviertAnzahl = objekte.filter((o) => o.status === "reserviert").length
  const langeStillAnzahl = offeneAnfragen.filter(
    (a) => a.letzter_kontakt !== null && puls(new Date(a.letzter_kontakt)) < 25
  ).length

  return (
    <>
      <Seitenkopf titel="Matches" kontext={kontextMatches(matches.length, langeStillAnzahl, reserviertAnzahl)} />
      <main className={SEITEN_INHALT_KLASSE}>
        <MatchesAnsicht
          matches={matches satisfies NeuerMatch[]}
          letzteKontakte={letzteKontakte}
          offeneAnzahl={offeneAnzahl}
          langeStillAnzahl={langeStillAnzahl}
          objektAnzahl={objekte.length}
          reserviertAnzahl={reserviertAnzahl}
          langeStillAnfragen={langeStillAnfragen}
        />
      </main>
    </>
  )
}
