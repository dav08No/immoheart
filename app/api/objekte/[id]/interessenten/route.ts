import { NextResponse } from "next/server"
import { idSchema } from "@/app/actions/entwuerfe-hilfen"
import { holeInteressenten } from "@/lib/queries/interessenten"

// Wie /api/anfragen/[id]/detail: das Objekt-Panel lädt seine Interessenten per fetch nach,
// statt die ganze Objektseite je geöffnetem Objekt mitzuladen. Zugriff regelt RLS.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const geprueft = idSchema.safeParse(id)
  if (!geprueft.success) return NextResponse.json({ fehler: "Ungültige ID." }, { status: 400 })
  const daten = await holeInteressenten(geprueft.data)
  if (!daten) return NextResponse.json({ fehler: "Objekt nicht gefunden." }, { status: 404 })
  return NextResponse.json(daten)
}
