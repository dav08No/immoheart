"use server"

import { revalidatePath } from "next/cache"
import { setzeRegelAktiv } from "@/lib/queries/regeln"

export async function regelUmschalten(id: string, aktiv: boolean): Promise<void> {
  await setzeRegelAktiv(id, aktiv)
  revalidatePath("/regeln")
}
