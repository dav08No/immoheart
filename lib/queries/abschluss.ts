// Aufrufe der atomaren Übergangsfunktionen (Migration 20260929110000_abschluss_b.sql).
// Server-Client statt Admin-Client: die Funktionen laufen als security invoker, damit die
// RLS-Policies "aktives konto …" auch hier greifen.
import "server-only"
import { erstelleServerClient } from "@/lib/supabase/server"
import { NutzerFehler } from "@/lib/nutzer-fehler"

export type Uebergang = { objekt_id: string; anfrage_id: string | null; erledigte_treffer: string[] }

type UebergangsZeile = { objekt_id: string; anfrage_id: string | null; erledigte_treffer: string[] | null }
type RpcFehler = { code?: string; message: string }

// raise exception ohne eigenen errcode liefert P0001; die Texte sind bewusst deutsche
// Sätze für die Nutzerin. Alles andere (Deadlock, RLS, Netzwerk) ist unerwartet.
function pruefeFehler(error: RpcFehler | null): void {
  if (!error) return
  if (error.code === "P0001") throw new NutzerFehler(error.message)
  throw error
}

// returns table liefert immer ein Array mit genau einer Zeile.
function zuUebergang(data: UebergangsZeile[] | null): Uebergang {
  const zeile = data?.[0]
  if (!zeile) throw new Error("Übergangsfunktion lieferte kein Ergebnis.")
  return {
    objekt_id: zeile.objekt_id,
    anfrage_id: zeile.anfrage_id ?? null,
    erledigte_treffer: zeile.erledigte_treffer ?? [],
  }
}

export async function reserviereTreffer(matchId: string): Promise<Uebergang> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.rpc("treffer_reservieren", { p_match: matchId })
  pruefeFehler(error)
  return zuUebergang(data)
}

// erledigte_treffer = andere angebotene Treffer desselben Objekts (erhalten eine Absage).
export async function vermittleTreffer(matchId: string): Promise<Uebergang> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.rpc("treffer_vermitteln", { p_match: matchId })
  pruefeFehler(error)
  return zuUebergang(data)
}

export async function hebeReservierungAuf(matchId: string): Promise<Uebergang> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.rpc("reservierung_aufheben", { p_match: matchId })
  pruefeFehler(error)
  return zuUebergang(data)
}

export async function lehneTrefferAb(matchId: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.rpc("treffer_ablehnen", { p_match: matchId })
  pruefeFehler(error)
}

// erledigte_treffer = alle vorher angebotenen oder reservierten Treffer des Objekts.
export async function meldeObjektNichtVerfuegbar(objektId: string): Promise<Uebergang> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.rpc("objekt_nicht_verfuegbar", { p_objekt: objektId })
  pruefeFehler(error)
  return zuUebergang(data)
}

export async function setzeObjektWiederVerfuegbar(objektId: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.rpc("objekt_wieder_verfuegbar", { p_objekt: objektId })
  pruefeFehler(error)
}
