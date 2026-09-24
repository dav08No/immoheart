import { Header } from "@/components/layout/Header"
import { ObjekteAnsicht } from "@/components/objekte/ObjekteAnsicht"
import { holeObjekte, zaehleNeueMatchesFuerObjekt } from "@/lib/queries/objekte"

export default async function ObjektePage() {
  const objekte = await holeObjekte()
  // zaehleNeueMatchesFuerObjekt (nicht das ungefilterte zaehleMatchesFuerObjekt)
  // -- ObjektRaster erwartet laut eigenem JSDoc-Kommentar eine status='neu'-
  // gefilterte Zählung fuer sein "N neue Treffer"-Badge, siehe dortiger Kommentar.
  const trefferPaare = await Promise.all(
    objekte.map(async (o) => [o.id, await zaehleNeueMatchesFuerObjekt(o.id)] as const),
  )
  const treffer = Object.fromEntries(trefferPaare)

  return (
    <>
      <Header titel="Objekte" untertitel={`${objekte.length} im Bestand`} />
      <main className="flex-1 overflow-y-auto p-5">
        <ObjekteAnsicht objekte={objekte} treffer={treffer} />
      </main>
    </>
  )
}
