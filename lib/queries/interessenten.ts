// Interessenten eines Objekts für das Objekt-Panel (Spec §3). Feste Zahl an Abfragen
// (Objekt, Treffer mit Firma, fehlende Entwürfe) statt einer Abfrage je Zeile.
import "server-only"
import { erstelleServerClient } from "@/lib/supabase/server"
import { baueInteressenten, type Interessent } from "@/lib/abschluss/interessenten"
import type { ObjektStatus } from "@/lib/abschluss/uebergaenge"
import { zaehleFehlendeEntwuerfe } from "./angebote"

export type { Interessent }

export type ObjektInteressentenDaten = {
  // Frisch mitgeladen: nach einer Aktion zeigt das Panel den Stand, zu dem die Zeilen passen.
  objektStatus: ObjektStatus
  interessenten: Interessent[]
  fehlendeEntwuerfe: number
}

export async function holeInteressenten(objektId: string): Promise<ObjektInteressentenDaten | null> {
  const supabase = await erstelleServerClient()
  const [objekt, treffer, fehlend] = await Promise.all([
    supabase.from("objekte").select("status").eq("id", objektId).maybeSingle(),
    supabase
      .from("matches")
      .select("id, status, angeboten_am, anfragen(status, firmen(name))")
      .eq("objekt_id", objektId)
      .not("status", "in", "(neu,verworfen)")
      .order("angeboten_am", { ascending: false, nullsFirst: false }),
    zaehleFehlendeEntwuerfe([objektId]),
  ])
  if (objekt.error) throw objekt.error
  if (treffer.error) throw treffer.error
  if (!objekt.data) return null

  const roh = treffer.data.map((t) => ({
    id: t.id,
    status: t.status,
    angeboten_am: t.angeboten_am,
    anfrage: t.anfragen ? { status: t.anfragen.status, firma: t.anfragen.firmen?.name ?? null } : null,
  }))
  return {
    objektStatus: objekt.data.status,
    interessenten: baueInteressenten(roh),
    fehlendeEntwuerfe: fehlend.get(objektId) ?? 0,
  }
}
