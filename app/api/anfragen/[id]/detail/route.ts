import { NextResponse } from "next/server"
import { holeBesterMatchFuerAnfrage } from "@/lib/queries/matches"
import { holeVerlaufFuerAnfrage } from "@/lib/queries/anfragen"

// Erste Route-Handler-API des Projekts (bisher lief jeder Datenzugriff über Server
// Components + lib/queries/* direkt) -- gerechtfertigt, weil AnfragenAnsicht (Task 52)
// bester Treffer/Verlauf pro ausgewählter Zeile per Client-seitigem fetch nachlädt,
// statt bei jedem Zeilenwechsel die ganze Seite neu zu rendern. `params` ist in
// Next.js 15 async (siehe next.config.js/package.json: "next": "15.5.25") --
// dieselbe Signatur, die der Plan für diese Route vorsieht.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [besterMatch, verlauf] = await Promise.all([holeBesterMatchFuerAnfrage(id), holeVerlaufFuerAnfrage(id)])
  return NextResponse.json({ besterMatch, verlauf })
}
