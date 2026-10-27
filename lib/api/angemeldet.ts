import { erstelleServerClient } from "@/lib/supabase/server"

// Für Route-Handler: holeEigenesProfil() leitet per redirect() um, was in einer JSON-API
// keinen Sinn ergibt. Inaktive Konten blockiert weiterhin RLS (ist_aktives_konto).
export async function istAngemeldet(): Promise<boolean> {
  const supabase = await erstelleServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user !== null
}

// Strenger für Routen, die viel auf einmal herausgeben (Rapport): Sitzung UND aktives
// Profil. Fehler beim Lesen gelten als nicht aktiv, damit nie etwas durchrutscht.
export async function istAktivAngemeldet(): Promise<boolean> {
  const supabase = await erstelleServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data, error } = await supabase.from("profiles").select("aktiv").eq("user_id", user.id).maybeSingle()
  return !error && data?.aktiv === true
}
