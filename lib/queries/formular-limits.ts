// Zähler für das Rate-Limit öffentlicher Formulare. Admin-Client: die RPC ist laut
// Migration nur für service_role ausführbar, damit anonyme Besucher den Zähler nicht
// direkt (z.B. mit einem falschen Fenster) manipulieren können.
import "server-only"
import { erstelleAdminClient } from "@/lib/supabase/admin"

export async function zaehleEinsendung(ipHash: string, fenster: string): Promise<number> {
  const supabase = erstelleAdminClient()
  const { data, error } = await supabase.rpc("formular_zaehlen", { p_ip_hash: ipHash, p_fenster: fenster })
  if (error) throw error
  return data
}
