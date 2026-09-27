// Gemeinsame Hilfsfunktionen für entwuerfe.ts und entwurf-senden.ts (Task N3-Fix,
// Datei-Längenlimit): kein "use server" hier -- Dateien mit "use server" dürfen laut
// Next.js ausschliesslich async Funktionen exportieren, idSchema (ein Zod-Schema) und
// pfadeNeuLaden (synchron) würden den Build brechen. Beide "use server"-Dateien
// importieren diese Helfer ganz normal, ohne sie selbst zu reexportieren.
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { holeNachricht } from "@/lib/queries/nachrichten"
import { NutzerFehler } from "@/lib/nutzer-fehler"

// z.guid statt z.uuid: die Seed-Objekte/-Anfragen haben IDs wie 22222222-…-222222222201,
// die das strikte RFC-Format von z.uuid() abweist.
export const idSchema = z.guid()

export type Ergebnis = { fehler: string | null }

export function pfadeNeuLaden() {
  revalidatePath("/admin/entwuerfe")
  revalidatePath("/admin/postfach")
  revalidatePath("/admin", "layout")
}

// Lehnt zusätzlich zu bereits gelöschten auch gerade reservierte (gesendet_am
// gesetzt, aber richtung noch "entwurf") Entwürfe ab: entwurfSpeichern/
// entwurfLoeschen/entwurfSenden dürfen einen Entwurf, der sich mitten im Versand
// befindet (siehe reserviereEntwurf), nicht mehr unter dem laufenden Versand
// verändern oder löschen -- das würde z.B. den Text nach dem SMTP-Versand, aber
// vor dem markiereGesendet-Update überschreiben. Wirft NutzerFehler statt Error
// (N3-Review, Fund 3): beide Bedingungen sind für die Nutzerin verständliche,
// erwartbare Zustände, keine Programmierfehler.
export async function offenerEntwurf(id: string) {
  const entwurf = await holeNachricht(idSchema.parse(id))
  if (!entwurf || entwurf.richtung !== "entwurf" || entwurf.geloescht_am) throw new NutzerFehler("Entwurf nicht gefunden")
  if (entwurf.gesendet_am) throw new NutzerFehler("Dieser Entwurf wird gerade gesendet.")
  return entwurf
}
