// Rohdaten des Jahresrapports, einschliesslich archivierter Daten. Genau 6 Abfragen
// (je seitenweise), unabhängig von der Datenmenge; die genaue Zürcher Tagesgrenze zieht
// danach lib/rapport/auswahl.ts. Server-Client: RLS lässt nur aktive Konten lesen.
import "server-only"
import { erstelleServerClient } from "@/lib/supabase/server"
import type { RapportRohdaten } from "@/lib/rapport/roh"
import type { RapportZeitraum } from "@/lib/rapport/zeitraum"
import { alleSeiten } from "./seiten"

// Nur Spalten ohne Personendaten: keine E-Mails, Kontakte, Eigentümer oder Mailtexte.
const ANFRAGE = "id, firma_id, created_at, quelle, status, nutzung, flaeche_min, flaeche_max, ort, budget_pro_m2, archiviert_am"
const OBJEKT = "id, titel, ort, flaeche, preis_pro_m2, nutzung, status, created_at, archiviert_am"
const TREFFER = "id, anfrage_id, objekt_id, status, score, created_at, angeboten_am, abgeschlossen_am"
const ARCHIV = "id, match_id, anfrage_id, objekt_id, status, score, treffer_erstellt_am, abgeschlossen_am, archiviert_am, grund"

export async function holeRapportRohdaten(zeitraum: Pick<RapportZeitraum, "abfrageAb">): Promise<RapportRohdaten> {
  const supabase = await erstelleServerClient()
  // Reines Datum (yyyy-mm-dd): kein Doppelpunkt im or()-Filter, Puffer von einem Tag.
  const ab = zeitraum.abfrageAb

  const [anfragen, objekte, firmen, treffer, trefferArchiv, angebote] = await Promise.all([
    // Anfragen, Objekte und Firmen ganz: sie sind zugleich die Namens-Nachschlagetabellen
    // für Treffer/Angebote zu älteren Anfragen und Objekten (kleiner Bestand).
    alleSeiten((von, bis) => supabase.from("anfragen").select(ANFRAGE).order("id").range(von, bis)),
    alleSeiten((von, bis) => supabase.from("objekte").select(OBJEKT).order("id").range(von, bis)),
    alleSeiten((von, bis) => supabase.from("firmen").select("id, name").order("id").range(von, bis)),
    // Neue Treffer, Vermittlungen im Zeitraum und alle je angebotenen (für das Ergebnis
    // eines Angebots, auch wenn der Treffer älter ist).
    alleSeiten((von, bis) =>
      supabase
        .from("matches")
        .select(TREFFER)
        .or(`created_at.gte.${ab},abgeschlossen_am.gte.${ab},angeboten_am.not.is.null`)
        .order("id")
        .range(von, bis)
    ),
    alleSeiten((von, bis) =>
      supabase
        .from("treffer_archiv")
        .select(ARCHIV)
        .or(`treffer_erstellt_am.gte.${ab},archiviert_am.gte.${ab}`)
        .order("id")
        .range(von, bis)
    ),
    // Auch aus dem Postfach gelöschte: ein gesendetes Angebot bleibt gesendet (wie zahlen.ts).
    alleSeiten((von, bis) =>
      supabase
        .from("nachrichten")
        .select("match_id, anfrage_id, objekt_id, gesendet_am")
        .eq("typ", "angebot")
        .eq("richtung", "gesendet")
        .gte("gesendet_am", ab)
        .order("id")
        .range(von, bis)
    ),
  ])

  return { anfragen, objekte, firmen, treffer, trefferArchiv, angebote }
}
