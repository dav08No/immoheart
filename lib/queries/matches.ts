import { erstelleServerClient } from "@/lib/supabase/server"
import { berechneMatch } from "@/lib/matching"
import { holeAnfrage, zuAnfrageDomain } from "@/lib/queries/anfragen"
import { holeVerfuegbareObjekte, zuObjektDomain } from "@/lib/queries/objekte"

// Richtung Anfrage -> Objekte (aufgerufen nach jedem Anlegen/Ändern einer
// Anfrage, siehe app/actions/anfragen.ts Task 48). Die Gegenrichtung
// (Objekt -> Anfragen, ausgelöst z.B. wenn ein Objekt neu verfügbar wird)
// folgt erst in M7 zusammen mit dem vollständigen objekte.ts.
//
// upsert statt Löschen+Neuanlegen: ein bereits gesendeter oder verworfener
// Match darf durch ein erneutes Berechnen nicht verschwinden. Der
// unique(anfrage_id, objekt_id)-Constraint auf matches (20260922195257_schema.sql,
// Zeile 75) macht den onConflict-Pfad gültig; da das Upsert-Payload `status`
// nicht enthält, lässt PostgREST bei einem Konflikt den bestehenden
// status-Wert unverändert (nur score/kriterien/hinweis werden aktualisiert)
// -- ein bereits gesendeter/verworfener Match bleibt also in seinem Status,
// nur seine Bewertung wird aufgefrischt. Nur status='neu'-Zeilen werden bei
// einem nun zu schwachen Score (kein Match mehr) im else-Zweig entfernt: das
// .eq("status", "neu") im DELETE lässt gesendet/verworfen-Zeilen unberührt,
// da für sie schlicht keine Zeile den Filter erfüllt.
export async function berechneUndSpeichereMatchesFuerAnfrage(anfrageId: string): Promise<void> {
  const [anfrageRow, objektRows] = await Promise.all([holeAnfrage(anfrageId), holeVerfuegbareObjekte()])
  // Kein Fehler, sondern ein no-op: dieser Aufruf kommt aus anfrageAnlegen/
  // anfrageAktualisieren direkt nach einem erfolgreichen Schreibzugriff auf
  // dieselbe Zeile, daher tritt !anfrageRow praktisch nur bei einer seltenen
  // Race (Löschung zwischen Schreiben und Rematch) auf -- dann gibt es auch
  // nichts mehr, gegen das gematcht werden könnte.
  if (!anfrageRow) return
  const anfrage = zuAnfrageDomain(anfrageRow)
  const supabase = await erstelleServerClient()

  for (const objektRow of objektRows) {
    const objekt = zuObjektDomain(objektRow)
    const match = berechneMatch(anfrage, objekt)
    if (match) {
      const { error } = await supabase
        .from("matches")
        .upsert(
          { anfrage_id: anfrage.id, objekt_id: objekt.id, score: match.score, kriterien: match.kriterien, hinweis: match.hinweis },
          { onConflict: "anfrage_id,objekt_id" }
        )
      if (error) throw error
    } else {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("anfrage_id", anfrage.id)
        .eq("objekt_id", objekt.id)
        .eq("status", "neu")
      if (error) throw error
    }
  }
}

export async function holeBesterMatchFuerAnfrage(anfrageId: string) {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("matches")
    .select("*, objekte(titel)")
    .eq("anfrage_id", anfrageId)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}
