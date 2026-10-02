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
