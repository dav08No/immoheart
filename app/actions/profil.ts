"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { erstelleAdminClient } from "@/lib/supabase/admin"
import { holeEigenesProfil } from "@/lib/queries/profile"

const nameSchema = z.string().trim().min(1).max(80)

// Eingeloggte Nutzer haben kein Update-Recht auf profiles (Migration N2) -- der
// Name wird nach Prüfung des eigenen, aktiven Profils mit dem Admin-Client gesetzt,
// ausschliesslich für die eigene user_id.
export async function nameAendern(name: string): Promise<void> {
  const profil = await holeEigenesProfil()
  const geprueft = nameSchema.safeParse(name)
  if (!geprueft.success) throw new Error("Bitte einen Namen angeben (max. 80 Zeichen).")
  const { error } = await erstelleAdminClient().from("profiles").update({ name: geprueft.data }).eq("user_id", profil.user_id)
  if (error) throw error
  revalidatePath("/admin", "layout")
}
