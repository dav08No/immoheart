import "server-only"
import { erstelleAdminClient } from "@/lib/supabase/admin"
import { kontoStatus, type KontoStatus } from "@/lib/nutzer-regeln"

export type Konto = { userId: string; name: string; email: string; darfNutzerAnlegen: boolean; status: KontoStatus }

// Auth-Daten (E-Mail, letzte Anmeldung) und Profile liegen getrennt; der
// Admin-Client liest beide. Aufrufer müssen vorher holeBerechtigtesProfil() prüfen.
export async function holeKonten(): Promise<Konto[]> {
  const admin = erstelleAdminClient()
  const [{ data: authDaten, error: authFehler }, { data: profile, error: profilFehler }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    admin.from("profiles").select("user_id, name, aktiv, darf_nutzer_anlegen"),
  ])
  if (authFehler) throw authFehler
  if (profilFehler) throw profilFehler

  const profilNachUser = new Map(profile.map((p) => [p.user_id, p]))
  return authDaten.users
    .flatMap((u) => {
      const p = profilNachUser.get(u.id)
      if (!p) return []
      return [
        {
          userId: u.id,
          name: p.name,
          email: u.email ?? "",
          darfNutzerAnlegen: p.darf_nutzer_anlegen,
          status: kontoStatus(p.aktiv, u.last_sign_in_at ?? null),
        },
      ]
    })
    .sort((a, b) => a.name.localeCompare(b.name, "de"))
}

export async function zaehleAktiveMitRecht(): Promise<number> {
  const admin = erstelleAdminClient()
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("aktiv", true)
    .eq("darf_nutzer_anlegen", true)
  if (error) throw error
  return count ?? 0
}
