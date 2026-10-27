// Gemeinsam für alle atomaren DB-Funktionen (Abschluss, Archiv).
import { NutzerFehler } from "@/lib/nutzer-fehler"

export type RpcFehler = { code?: string; message: string }

// raise exception ohne eigenen errcode liefert P0001; die Texte sind bewusst deutsche
// Sätze für die Nutzerin. Alles andere (Deadlock, RLS, Netzwerk) ist unerwartet.
export function pruefeRpcFehler(error: RpcFehler | null): void {
  if (!error) return
  if (error.code === "P0001") throw new NutzerFehler(error.message)
  throw error
}
