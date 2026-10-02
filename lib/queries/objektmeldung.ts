import { erstelleServerClient } from "@/lib/supabase/server"
import { objektEckdaten } from "@/lib/eingang/objekt-zuordnung"
import type { ObjektStatus } from "@/lib/abschluss/uebergaenge"

// Status gibt der Aufrufer vor (zuordenbareStatus, R12): vermietete Objekte nur bei
// "wieder verfügbar", sonst verderben sie die Eindeutigkeit per Eigentümer-Adresse.
export async function holeAktiveObjekteNachEigentuemer(status: ObjektStatus[]): Promise<Record<string, string[]>> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("objekte")
    .select("id, eigentuemer_email")
    .in("status", status)
    .not("eigentuemer_email", "is", null)
  if (error) throw error
  const nachEigentuemer: Record<string, string[]> = {}
  for (const o of data) {
    const email = o.eigentuemer_email?.trim().toLowerCase()
    if (!email) continue
    nachEigentuemer[email] = [...(nachEigentuemer[email] ?? []), o.id]
  }
  return nachEigentuemer
}

export async function holeObjektTitel(objektId: string): Promise<string | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("objekte").select("titel").eq("id", objektId).maybeSingle()
  if (error) throw error
  return data?.titel ?? null
}

// Objekt hinter einem Treffer, als Kontext für die Antwort auf ein gesendetes Angebot.
export async function holeAngebotFuerTreffer(
  matchId: string
): Promise<{ objektTitel: string; eckdaten: string } | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("matches")
    .select("objekte(titel, flaeche, preis_pro_m2, ort)")
    .eq("id", matchId)
    .maybeSingle()
  if (error) throw error
  const objekt = data?.objekte
  return objekt ? { objektTitel: objekt.titel, eckdaten: objektEckdaten(objekt) } : null
}
