// Angebote einer Anfrage für das Anfrage-Panel (Spec §3) plus das Aufräumen bei
// manuellem Statuswechsel. Eigene Datei, weil matches.ts an der 200-Zeilen-Grenze ist.
import "server-only"
import { erstelleServerClient } from "@/lib/supabase/server"
import { ABSCHLUSS_TYPEN, zuFuellendePlatzhalter } from "@/lib/abschluss/entwuerfe-plan"
import { baueAngebote, type Angebot } from "@/lib/abschluss/angebote"

export type { Angebot }

// Offene Platzhalter je Objekt. Nicht roh nach ki_ausstehend zählen: ein von Hand
// gefüllter Entwurf behält das Flag, zuFuellendePlatzhalter prüft zusätzlich den Text.
export async function zaehleFehlendeEntwuerfe(objektIds: string[]): Promise<Map<string, number>> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("nachrichten")
    .select("objekt_id, typ, richtung, body, geloescht_am, gesendet_am, erkannte_felder")
    .in("objekt_id", objektIds)
    .eq("richtung", "entwurf")
    .in("typ", [...ABSCHLUSS_TYPEN])
    .is("geloescht_am", null)
    .is("gesendet_am", null)
  if (error) throw error
  const zaehler = new Map<string, number>()
  for (const z of zuFuellendePlatzhalter(data)) {
    if (z.objekt_id) zaehler.set(z.objekt_id, (zaehler.get(z.objekt_id) ?? 0) + 1)
  }
  return zaehler
}

export async function holeAngeboteFuerAnfrage(anfrageId: string): Promise<Angebot[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("matches")
    .select("id, status, angeboten_am, objekte(id, titel, status)")
    .eq("anfrage_id", anfrageId)
    .not("status", "in", "(neu,verworfen)")
    .order("angeboten_am", { ascending: false, nullsFirst: false })
  if (error) throw error

  const eigene = data.flatMap((m) =>
    m.objekte ? [{ id: m.id, status: m.status, angeboten_am: m.angeboten_am, objekt: m.objekte }] : []
  )
  if (eigene.length === 0) return []
  const objektIds = [...new Set(eigene.map((t) => t.objekt.id))]

  // Alle angebotenen/reservierten Treffer derselben Objekte, auch die anderer Anfragen.
  const [{ data: andere, error: fehler }, fehlend] = await Promise.all([
    supabase
      .from("matches")
      .select("id, objekt_id, status, anfragen(firmen(name))")
      .in("objekt_id", objektIds)
      .in("status", ["gesendet", "reserviert"]),
    zaehleFehlendeEntwuerfe(objektIds),
  ])
  if (fehler) throw fehler
  const objektTreffer = andere.map((o) => ({
    id: o.id,
    objekt_id: o.objekt_id,
    status: o.status,
    firma: o.anfragen?.firmen?.name ?? null,
  }))
  return baueAngebote(eigene, objektTreffer, fehlend)
}

// Manuell ruhend/vermittelt: noch nicht angebotene Treffer gehören nicht mehr zur Anfrage.
export async function loescheNeueMatchesFuerAnfrage(anfrageId: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("matches").delete().eq("anfrage_id", anfrageId).eq("status", "neu")
  if (error) throw error
}
