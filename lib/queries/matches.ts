import { erstelleServerClient } from "@/lib/supabase/server"
import { berechneMatch } from "@/lib/matching"
import { holeAnfrage, holeOffeneAnfragen, zuAnfrageDomain } from "@/lib/queries/anfragen"
import { holeObjekt, holeVerfuegbareObjekte, zuObjektDomain } from "@/lib/queries/objekte"
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

// Gegenrichtung zu berechneUndSpeichereMatchesFuerAnfrage oben: läuft, wenn
// ein Objekt neu angelegt oder geändert wird, gegen ALLE offenen Anfragen
// (auch monatealte), nicht nur gegen die zuletzt bearbeitete. Bewusst eine
// zweite, fast identische Funktion statt einer gemeinsamen Abstraktion:
// erst beim dritten ähnlichen Fall würde sich das Zusammenfassen lohnen
// (README-Coderegel "keine Abstraktion vor der dritten Wiederholung").
// Upsert/Delete-Semantik (Status bleibt bei bereits gesendeten/verworfenen
// Matches unverändert, nur status='neu' wird bei zu schwachem Score
// entfernt) ist identisch zur Anfrage-Richtung, siehe deren Kommentar oben.
//
// Kritischer Fund (M7 Whole-Branch-Review): diese Funktion holte das Objekt
// bisher ungefiltert über holeObjekt(id) und matchte es gegen JEDE offene
// Anfrage, ganz ohne auf objekt.status zu schauen -- anders als die
// Gegenrichtung, die über holeVerfuegbareObjekte() nur status='verfuegbar'-
// Objekte überhaupt erst in die Schleife lässt (lib/queries/objekte.ts).
// Das war beim M6-Review noch "aktuell unerreichbar" (nichts konnte den
// Status setzen), bis Task 57s ObjektFormular einen Status-<select> im
// Bearbeiten-Modus einführte, dessen absenden() im selben werte-Objekt
// aber IMMER auch flaeche/ort/nutzung/verfuegbar_ab mitschickt (siehe
// MATCH_RELEVANTE_FELDER-Kommentar in app/actions/objekte.ts) -- jede
// Bearbeitung, auch ein reines "auf Vermietet setzen", löst damit einen
// vollen Rematch-Lauf aus. Ohne die Sperre unten würde dieser Lauf frische
// status='neu'-Matches zwischen einem gerade vermieteten Objekt und jeder
// offenen Anfrage anlegen -- ein Zustand, den die Anfrage-Richtung über
// ihren eigenen Verfügbarkeits-Filter nie herstellen würde (dieselbe
// berechneMatch-Logik, aber ein divergentes Ergebnis je nachdem, welche
// Seite den Rematch auslöst).
//
// Bei einem Nicht-verfuegbar-Objekt werden zusätzlich dessen bestehende
// status='neu'-Matches gelöscht statt nur keine neuen anzulegen: ohne diese
// Aufräumung blieben Matches, die entstanden, während das Objekt noch
// verfuegbar war, nach einem Statuswechsel auf reserviert/vermietet
// unbegrenzt liegen -- die Anfrage-Richtung besucht ein nicht mehr
// verfuegbares Objekt nie wieder (holeVerfuegbareObjekte() lässt es aus
// ihrer Schleife fallen, statt es zu besuchen und aufzuräumen), und
// holeBesterMatchFuerAnfrage (M6) filtert selbst nicht nach objekt.status --
// eine solche Altzeile könnte also weiterhin als "Bester Treffer" einer
// Anfrage auftauchen und in ObjektRasters "N neue Treffer"-Badge
// (zaehleNeueMatchesFuerObjekt) einfliessen, obwohl das zugehörige Objekt
// bereits als vermietet markiert ist. Wie beim score-basierten Löschzweig
// oben bleibt das gezielt auf status='neu' beschränkt: gesendet/verworfen-
// Zeilen (bereits bearbeitete Matches) werden nie angetastet, konsistent
// mit dem in diesem Milestone durchgehend eingehaltenen Prinzip "keine
// bereits bearbeiteten Matches zerstören".
export async function berechneUndSpeichereMatchesFuerObjekt(objektId: string): Promise<void> {
  const [objektRow, anfrageRows] = await Promise.all([holeObjekt(objektId), holeOffeneAnfragen()])
  // Kein Fehler, sondern ein no-op -- siehe die analoge Begründung bei
  // berechneUndSpeichereMatchesFuerAnfrage oben.
  if (!objektRow) return
  const supabase = await erstelleServerClient()

  if (objektRow.status !== "verfuegbar") {
    const { error } = await supabase.from("matches").delete().eq("objekt_id", objektId).eq("status", "neu")
    if (error) throw error
    return
  }

  const objekt = zuObjektDomain(objektRow)

  for (const anfrageRow of anfrageRows) {
    const anfrage = zuAnfrageDomain(anfrageRow)
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

export type NeuerMatch = {
  id: string
  score: number
  kriterien: Kriterium[]
  hinweis: string
  objekt: { titel: string; adresse: string; flaeche: number; preis_pro_m2: number | null; foto_url: string | null }
  anfrage: { id: string; flaeche_min: number | null; flaeche_max: number | null; letzter_kontakt: string }
  firma: { name: string; website: string | null } | null
}

export async function holeNeueMatches(): Promise<NeuerMatch[]> {
  const supabase = await erstelleServerClient()
  const [
    { data: matchRows, error: matchError },
    { data: anfragenData, error: anfragenError },
    { data: firmenData, error: firmenError },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("*, objekte(titel, adresse, flaeche, preis_pro_m2, foto_url)")
      .eq("status", "neu")
      .order("score", { ascending: false }),
    supabase.from("anfragen").select("id, firma_id, flaeche_min, flaeche_max, letzter_kontakt"),
    supabase.from("firmen").select("id, name, website"),
  ])
  if (matchError) throw matchError
  if (anfragenError) throw anfragenError
  if (firmenError) throw firmenError

  const anfragenNachId = new Map(anfragenData.map((a) => [a.id, a]))
  const firmenNachId = new Map(firmenData.map((f) => [f.id, f]))

  return matchRows.flatMap((m) => {
    const anfrage = anfragenNachId.get(m.anfrage_id)
    if (!anfrage || !m.objekte) return []
    return [
      {
        id: m.id,
        score: m.score,
        kriterien: m.kriterien as Kriterium[],
        hinweis: m.hinweis,
        objekt: m.objekte,
        anfrage: {
          id: anfrage.id,
          flaeche_min: anfrage.flaeche_min,
          flaeche_max: anfrage.flaeche_max,
          letzter_kontakt: anfrage.letzter_kontakt,
        },
        firma: anfrage.firma_id ? (firmenNachId.get(anfrage.firma_id) ?? null) : null,
      },
    ]
  })
}
