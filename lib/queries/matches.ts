import { erstelleServerClient } from "@/lib/supabase/server"
import { berechneMatch } from "@/lib/matching"
import { holeAnfrage, zuAnfrageDomain } from "@/lib/queries/anfragen"
import { holeVerfuegbareObjekte, zuObjektDomain } from "@/lib/queries/objekte"
import { holeEigenesProfil } from "@/lib/queries/profile"
import type { Kriterium } from "@/types"

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

// Kritischer Fund (M6 Whole-Branch-Review): kriterien wird beim Berechnen/
// Speichern (berechneUndSpeichereMatchesFuerAnfrage oben, nur aus admin/
// vermittler-Schreibpfaden aufgerufen) mit dem ECHTEN, unmaskierten Budget
// aus der anfragen-Basistabelle befüllt (lib/matching.ts, kriteriumPreis:
// `bis ${formatPreis(anfrage.budgetProM2)}`) und landet unverändert in
// dieser jsonb-Spalte. Die SELECT-Policy auf matches (20260922195659_rls.sql,
// "eingeloggt liest matches") hat -- anders als anfragen_sichtbar -- KEINE
// vertraulich/Rollen-Einschränkung: jede eingeloggte Rolle inkl. leser darf
// die volle Zeile lesen. Ohne diese Maskierung hier würde das reale Budget
// einer vertraulichen Anfrage über die kriterien-Spalte an leser
// durchsickern, obwohl dieselbe Anfrage in anfragen_sichtbar (und damit in
// der "Daten"-Sektion desselben Drawers) korrekt als "?" maskiert ankommt.
//
// Scoped Re-Review (M6 Whole-Branch-Review, Fix-Welle 2): die erste Fassung
// ersetzte nur `gesucht`, liess aber `status`/`hinweis` unverändert -- beides
// verrät das echte Budget indirekt, weil der (unmaskierte) Objekt-Preis in
// derselben Zeile steht: `status === "ok"` grenzt das Budget nach unten ein
// (`budget >= preis/1.17`), `status === "nein"` nach oben (`budget <
// preis/1.37`, siehe punktePreis unten), und `hinweis` kann wörtlich
// "Preis liegt deutlich/leicht über dem genannten Budget." oder "Kein Budget
// genannt." lauten, sobald Preis das schwächste Kriterium ist. Für Preis wird
// deshalb zusätzlich `status` auf einen neutralen Wert erzwungen und `hinweis`
// generisch ersetzt, falls er einer der vier Preis-spezifischen Texte aus
// lib/matching.ts ist. `angeboten` (der Objekt-Preis, nicht Teil der
// vertraulichen Anfrage) und der Gesamt-`score` bleiben unverändert: `score`
// ist eine gewichtete Summe über alle fünf Kriterien, deren übrige vier
// Eingaben (Fläche/Ort/Bezug/Anforderungen) für leser ohnehin unmaskiert in
// derselben Anfrage sichtbar sind -- ihn zusätzlich zu verschleiern würde die
// Match-Sortierung/-Nützlichkeit beschädigen, ohne einen ebenso direkten,
// niedrigschwelligen Kanal wie status/hinweis zu schliessen. Die persistierte
// Zeile in `matches` selbst bleibt unverändert -- die Maskierung passiert
// ausschliesslich hier im Lesepfad, bei jedem Aufruf neu, nie beim Schreiben.
const BUDGET_MASKIERT = "—"
const BUDGET_HINWEIS_MASKIERT = "Details zum Budget sind vertraulich."
const PREIS_HINWEISE = new Set([
  "Kein Budget genannt.",
  "Preis des Objekts ist auf Anfrage, kein Vergleich möglich.",
  "Preis liegt deutlich über dem genannten Budget.",
  "Preis liegt leicht über dem genannten Budget.",
])

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
  if (!data) return data

  const [profil, { data: anfrageSichtbar, error: anfrageError }] = await Promise.all([
    holeEigenesProfil(),
    supabase.from("anfragen_sichtbar").select("vertraulich").eq("id", anfrageId).maybeSingle(),
  ])
  if (anfrageError) throw anfrageError

  if (profil.rolle === "leser" && anfrageSichtbar?.vertraulich) {
    const kriterien = (data.kriterien as unknown as Kriterium[]).map((k) =>
      k.kriterium === "Preis" ? { ...k, gesucht: BUDGET_MASKIERT, status: "teilweise" as const } : k
    )
    const hinweis = PREIS_HINWEISE.has(data.hinweis) ? BUDGET_HINWEIS_MASKIERT : data.hinweis
    return { ...data, kriterien, hinweis }
  }

  return data
}
