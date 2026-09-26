import { redirect } from "next/navigation"
import { erstelleServerClient } from "@/lib/supabase/server"
import type { Profil } from "@/types"

export async function holeEigenesProfil(): Promise<Profil> {
  const supabase = await erstelleServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle()
  if (error) throw error
  // Ohne Profil oder mit deaktiviertem Konto liefert RLS keine Zeile. Ein Redirect
  // direkt auf /login würde von der Middleware sofort nach /admin zurückgeschickt
  // (die Session besteht ja noch) -- deshalb zuerst abmelden.
  if (!data || !data.aktiv) redirect("/abmelden?grund=inaktiv")
  return data
}
