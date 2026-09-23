"use server"

import { revalidatePath } from "next/cache"
import { erstelleServerClient } from "@/lib/supabase/server"
import { holeEigenesProfil } from "@/lib/queries/profile"

export async function setzeFreigabeStufe(stufe: 1 | 2 | 3): Promise<void> {
  const profil = await holeEigenesProfil()
  const supabase = await erstelleServerClient()
  const { error } = await supabase.from("profiles").update({ freigabe_stufe: stufe }).eq("id", profil.id)
  if (error) throw error
  revalidatePath("/", "layout")
}
