import { NextResponse } from "next/server"
import { istAngemeldet } from "@/lib/api/angemeldet"
import { holeBesterMatchFuerAnfrage } from "@/lib/queries/matches"
import { holeVerlaufFuerAnfrage } from "@/lib/queries/anfragen"
import { holeAngeboteFuerAnfrage } from "@/lib/queries/angebote"

// Erste Route-Handler-API des Projekts (bisher lief jeder Datenzugriff über Server
// Components + lib/queries/* direkt) -- gerechtfertigt, weil AnfragenAnsicht (Task 52)
// bester Treffer/Verlauf pro ausgewählter Zeile per Client-seitigem fetch nachlädt,
// statt bei jedem Zeilenwechsel die ganze Seite neu zu rendern. `params` ist in
// Next.js 15 async (siehe next.config.js/package.json: "next": "15.5.25") --
// dieselbe Signatur, die der Plan für diese Route vorsieht.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Ohne Sitzung sofort 401: sonst scheitern die Abfragen an RLS und enden als 500.
  if (!(await istAngemeldet())) return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 })
  const { id } = await params
  const [besterMatch, verlauf, angebote] = await Promise.all([
    holeBesterMatchFuerAnfrage(id),
    holeVerlaufFuerAnfrage(id),
    holeAngeboteFuerAnfrage(id),
  ])
  return NextResponse.json({ besterMatch, verlauf, angebote })
}
