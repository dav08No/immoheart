import { NextResponse } from "next/server"
import { istAngemeldet } from "@/lib/api/angemeldet"
import { idSchema } from "@/app/actions/entwuerfe-hilfen"
import { holeInteressenten } from "@/lib/queries/interessenten"

// Wie /api/anfragen/[id]/detail: das Objekt-Panel lädt seine Interessenten per fetch nach,
// statt die ganze Objektseite je geöffnetem Objekt mitzuladen. Zugriff regelt RLS.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Ohne Sitzung sofort 401: sonst scheitern die Abfragen an RLS und enden als 500.
  if (!(await istAngemeldet())) return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 })
  const { id } = await params
  const geprueft = idSchema.safeParse(id)
  if (!geprueft.success) return NextResponse.json({ fehler: "Ungültige ID." }, { status: 400 })
  const daten = await holeInteressenten(geprueft.data)
  if (!daten) return NextResponse.json({ fehler: "Objekt nicht gefunden." }, { status: 404 })
  return NextResponse.json(daten)
}
