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

  // offeneAnzahl/langeStillAnzahl (die beiden rechten Kennzahlkacheln) werden
  // bewusst aus `anfragen` (anfragen_sichtbar, für jede Rolle inkl. leser
  // lesbar) abgeleitet statt aus `letzteKontakte` (holeOffenePulsWerte liest
  // die anfragen-Basistabelle, seit 20260923033041_rls_fix_base_table_read.sql
  // nur für admin/vermittler lesbar -- ein leser bekäme dort still `[]`, s.
  // Kommentar bei holeOffenePulsWerte). Ohne diese Angleichung würden die
  // Kacheln für einen leser 0 zeigen, während die "Lange nichts gehört"-Liste
  // direkt darunter (aus derselben `anfragen`-Quelle) bis zu drei echte Zeilen
  // anzeigt -- ein sich selbst widersprechendes Dashboard, da `/` keine
  // Rollensperre hat. `letzteKontakte` bleibt ausschliesslich Prop für
  // PulsHero, das für genau diesen leser-leeren Fall bereits einen eigenen
  // "keine Daten"-Leerzustand hat.
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
