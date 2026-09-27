import { erstelleServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type FirmaRow = Database["public"]["Tables"]["firmen"]["Row"]
type FirmaEinfuegen = Database["public"]["Tables"]["firmen"]["Insert"]

// kontakt_email wird ausschliesslich aus der bereits kleingeschriebenen Absenderadresse
// (nachrichten.von) befüllt -- ein eq auf die ebenfalls kleingeschriebene Suchadresse
// reicht deshalb für einen case-insensitiven Treffer, ohne ilike-Escaping von %/_.
export async function holeFirmaPerEmail(email: string): Promise<FirmaRow | null> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("firmen")
    .select("*")
    .eq("kontakt_email", email.toLowerCase())
    // kontakt_email ist nicht unique (zwei parallele Speichervorgänge können zwei Firmen
    // anlegen): die älteste nehmen statt mit maybeSingle() ab dann immer zu werfen.
    .order("created_at", { ascending: true })
    .limit(1)
  if (error) throw error
  return data[0] ?? null
}

export async function legeFirmaAn(firma: FirmaEinfuegen): Promise<FirmaRow> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("firmen").insert(firma).select().single()
  if (error) throw error
  return data
}

// Rollback-Pfad für alsAnfrageSpeichern (verlorene Doppelklick-Race): löscht eine
// gerade erst angelegte Firma nur, wenn wirklich keine Anfrage (mehr) auf sie zeigt --
// der GEWINNER der Race kann dieselbe Firma über holeFirmaPerEmail bereits
// übernommen und mit seiner Anfrage verknüpft haben, bevor der Verlierer aufräumt.
// Zählen+Löschen bleiben zwei Schritte (kein Constraint/Trigger dafür); das enge
// verbleibende Zeitfenster nimmt der Aufrufer bewusst in Kauf (best effort, siehe
// dortiger Kommentar).
export async function loescheFirmaFallsUnbenutzt(id: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { count, error: zaehlFehler } = await supabase
    .from("anfragen")
    .select("id", { count: "exact", head: true })
    .eq("firma_id", id)
  if (zaehlFehler) throw zaehlFehler
  if ((count ?? 0) > 0) return
  const { error } = await supabase.from("firmen").delete().eq("id", id)
  if (error) throw error
}
