import { Header } from "@/components/layout/Header"
import { MatchesAnsicht } from "@/components/matches/MatchesAnsicht"
import { holeNeueMatches, type NeuerMatch } from "@/lib/queries/matches"
import { holeOffenePulsWerte, holeAnfragen } from "@/lib/queries/anfragen"
import { holeObjekte } from "@/lib/queries/objekte"
import { formatZeitpunkt } from "@/lib/format"
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
  const langeStillAnzahl = offeneAnfragen.filter(
    (a) => a.letzter_kontakt !== null && puls(new Date(a.letzter_kontakt)) < 25
  ).length

  return (
    <>
      <Header titel="Matches" untertitel={formatZeitpunkt(new Date())} />
      <main className="flex-1 overflow-y-auto p-5">
        <MatchesAnsicht
          matches={matches satisfies NeuerMatch[]}
          letzteKontakte={letzteKontakte}
          offeneAnzahl={offeneAnzahl}
          langeStillAnzahl={langeStillAnzahl}
          objektAnzahl={objekte.length}
          langeStillAnfragen={langeStillAnfragen}
        />
      </main>
    </>
  )
}
