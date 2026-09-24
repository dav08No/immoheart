import { Header } from "@/components/layout/Header"
import { MatchesAnsicht } from "@/components/matches/MatchesAnsicht"
import { holeNeueMatches, type NeuerMatch } from "@/lib/queries/matches"
import { holeOffenePulsWerte, holeAnfragen } from "@/lib/queries/anfragen"
import { holeObjekte } from "@/lib/queries/objekte"
import { formatZeitpunkt } from "@/lib/format"

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
  const langeStillAnfragen = anfragen.filter((a) => a.status === "offen").slice(0, 3)

  return (
    <>
      <Header titel="Matches" untertitel={formatZeitpunkt(new Date())} />
      <main className="flex-1 overflow-y-auto p-5">
        <MatchesAnsicht
          matches={matches satisfies NeuerMatch[]}
          letzteKontakte={letzteKontakte}
          offeneAnzahl={letzteKontakte.length}
          objektAnzahl={objekte.length}
          langeStillAnfragen={langeStillAnfragen}
        />
      </main>
    </>
  )
}
