// Eigenes Modul (statt in oeffentlich.ts), damit holeOeffentlicheObjekte im Test
// gemockt werden kann -- ein Aufruf innerhalb desselben Moduls liesse sich nicht ersetzen.
import "server-only"
import { unstable_rethrow } from "next/navigation"
import { holeOeffentlicheObjekte } from "@/lib/queries/oeffentlich"
import { startDatenAus, type StartDaten } from "@/lib/kennzahlen"
import type { OeffentlichesObjekt } from "@/lib/objektsuche"

// Eine Abfrage für Zahlen und Highlights. Fällt die DB aus, erscheint die Startseite
// trotzdem -- dann ohne Zahlen und ohne Highlights.
export async function holeStartDaten(maxHighlights: number): Promise<StartDaten<OeffentlichesObjekt>> {
  try {
    return startDatenAus(await holeOeffentlicheObjekte(), maxHighlights)
  } catch (fehler) {
    // Next-interne Signale (z.B. "dynamisch rendern" wegen cookies()) nicht schlucken.
    unstable_rethrow(fehler)
    console.error("holeStartDaten", fehler)
    return { kennzahlen: null, highlights: [] }
  }
}
