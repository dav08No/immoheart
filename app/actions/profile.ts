"use server"

import { revalidatePath } from "next/cache"
import { erstelleServerClient } from "@/lib/supabase/server"
import { holeEigenesProfil } from "@/lib/queries/profile"

export async function setzeFreigabeStufe(stufe: 1 | 2 | 3): Promise<void> {
  // Eine Server Action ist ein öffentlicher HTTP-Endpunkt -- der Typ
  // "1 | 2 | 3" existiert zur Laufzeit nicht mehr. Ohne diese Prüfung wäre
  // der einzige Schutz gegen einen manipulierten Aufruf (z. B. stufe: 99)
  // zufällig der DB-CHECK-Constraint aus M1, nicht eine bewusste Prüfung an
  // dieser Vertrauensgrenze. Gefunden bei der finalen Milestone-Review.
  if (stufe !== 1 && stufe !== 2 && stufe !== 3) {
    throw new Error("Ungültige Freigabestufe")
  }
  const profil = await holeEigenesProfil()
  const supabase = await erstelleServerClient()
  // .select().single() statt eines reinen Update-Aufrufs: Supabase liefert
  // KEINEN Error, wenn RLS die Zielzeile herausfiltert (0 betroffene
  // Zeilen) -- ohne diesen Schritt würde revalidatePath trotzdem laufen und
  // die UI einen Erfolg melden, obwohl nichts geändert wurde. Heute nicht
  // erreichbar (die RLS-USING-Klausel lässt die eigene Zeile immer zu),
  // aber ein bewusster Selbst-Check an dieser Stelle ist billiger als das
  // stillschweigend falsch zu lassen.
  const { error } = await supabase
    .from("profiles")
    .update({ freigabe_stufe: stufe })
    .eq("id", profil.id)
    .select()
    .single()
  if (error) throw error
  revalidatePath("/", "layout")
}
