import { redirect } from "next/navigation"
import { erstelleServerClient } from "@/lib/supabase/server"
import type { Profil } from "@/types"

export async function holeEigenesProfil(): Promise<Profil> {
  const supabase = await erstelleServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).single()
  if (error) throw error
  return data
}
