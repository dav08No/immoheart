import { erstelleServerClient } from "@/lib/supabase/server"
import { berechneMatch } from "@/lib/matching"
import { holeAnfrage, holeOffeneAnfragen, zuAnfrageDomain } from "@/lib/queries/anfragen"
import { holeObjekt, holeVerfuegbareObjekte, zuObjektDomain } from "@/lib/queries/objekte"
import { holeTitelbilder } from "@/lib/queries/fotos"
import { holeMatchIdsMitOffenemEntwurf } from "@/lib/queries/versand"
import { entferneNeueTreffer } from "@/lib/queries/treffer-entfernen"
import type { Kriterium } from "@/types"

// Richtung Anfrage -> Objekte (aufgerufen nach jedem Anlegen/Ändern einer
// Anfrage, siehe app/actions/anfragen.ts).
//
// upsert statt Löschen+Neuanlegen: ein bereits gesendeter oder verworfener
// Match darf durch ein erneutes Berechnen nicht verschwinden. Der
// unique(anfrage_id, objekt_id)-Constraint auf matches macht den onConflict-Pfad
// gültig; da das Upsert-Payload `status` nicht enthält, bleibt der Status eines
// bestehenden Treffers unverändert, nur score/kriterien/hinweis werden aufgefrischt.
// Nur status='neu'-Zeilen ohne Treffer mehr werden entfernt -- gesammelt in einem
// Aufruf über das Archiv (Grund "passt nicht mehr"), nicht per direktem DELETE.
export async function berechneUndSpeichereMatchesFuerAnfrage(anfrageId: string): Promise<void> {
  const [anfrageRow, objektRows] = await Promise.all([holeAnfrage(anfrageId), holeVerfuegbareObjekte()])
  // !anfrageRow: seltene Race (Löschung zwischen Schreiben und Rematch) -> no-op.
  // Archivierte Anfragen sind von der Treffersuche ausgeschlossen (Spec §1).
  if (!anfrageRow || anfrageRow.archiviert_am) return
  const anfrage = zuAnfrageDomain(anfrageRow)
  const supabase = await erstelleServerClient()
  const ohneTreffer: string[] = []

  for (const objektRow of objektRows) {
    const objekt = zuObjektDomain(objektRow)
    const match = berechneMatch(anfrage, objekt)
    if (!match) {
      ohneTreffer.push(objekt.id)
      continue
    }
    const { error } = await supabase
      .from("matches")
      .upsert(
        { anfrage_id: anfrage.id, objekt_id: objekt.id, score: match.score, kriterien: match.kriterien, hinweis: match.hinweis },
        { onConflict: "anfrage_id,objekt_id" }
      )
    if (error) throw error
  }
  await entferneNeueTreffer("anfrage_id", anfrage.id, "passt nicht mehr", ohneTreffer)
}

// Gegenrichtung: läuft, wenn ein Objekt neu angelegt oder geändert wird, gegen ALLE
// offenen Anfragen. Bewusst eine zweite, fast identische Funktion statt einer
// gemeinsamen Abstraktion (README: keine Abstraktion vor der dritten Wiederholung).
//
// Nicht-verfuegbare Objekte werden nie gematcht; ihre status='neu'-Matches werden
// entfernt, weil die Anfrage-Richtung sie nie mehr besucht und sonst veraltete Treffer
// stehen blieben. gesendet/verworfen bleiben wie überall unangetastet.
export async function berechneUndSpeichereMatchesFuerObjekt(objektId: string): Promise<void> {
  const [objektRow, anfrageRows] = await Promise.all([holeObjekt(objektId), holeOffeneAnfragen()])
  // Wie oben: fehlend -> no-op, archiviert -> keine Treffersuche.
  if (!objektRow || objektRow.archiviert_am) return

  if (objektRow.status !== "verfuegbar") {
    await entferneNeueTreffer("objekt_id", objektId, "Objekt nicht verfügbar")
    return
  }

  const objekt = zuObjektDomain(objektRow)
  const supabase = await erstelleServerClient()
  const ohneTreffer: string[] = []

  for (const anfrageRow of anfrageRows) {
    const anfrage = zuAnfrageDomain(anfrageRow)
    const match = berechneMatch(anfrage, objekt)
    if (!match) {
      ohneTreffer.push(anfrage.id)
      continue
    }
    const { error } = await supabase
      .from("matches")
      .upsert(
        { anfrage_id: anfrage.id, objekt_id: objekt.id, score: match.score, kriterien: match.kriterien, hinweis: match.hinweis },
        { onConflict: "anfrage_id,objekt_id" }
      )
    if (error) throw error
  }
  await entferneNeueTreffer("objekt_id", objekt.id, "passt nicht mehr", ohneTreffer)
}

// status IN (neu, gesendet): ein bereits angebotenes Match bleibt "der beste Treffer",
// bis es reserviert/vermittelt/abgelehnt/erledigt und damit abgeschlossen ist.
export async function holeBesterMatchFuerAnfrage(anfrageId: string) {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase
    .from("matches")
    .select("*, objekte(titel)")
    .eq("anfrage_id", anfrageId)
    .in("status", ["neu", "gesendet"])
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

// Bedingtes Update wie aktualisiereAnfrage/letzter_kontakt: erst der tatsächliche Versand
// markiert den Treffer als angeboten, nicht schon das Anlegen des Entwurfs.
export async function markiereMatchAngeboten(matchId: string): Promise<void> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase
    .from("matches")
    .update({ status: "gesendet", angeboten_am: new Date().toISOString() })
    .eq("id", matchId)
    .eq("status", "neu")
  if (error) throw error
}

export type NeuerMatch = {
  id: string
  score: number
  kriterien: Kriterium[]
  hinweis: string
  // titelbild: erstes hochgeladenes Foto, sonst die alte foto_url.
  objekt: { titel: string; adresse: string; flaeche: number; preis_pro_m2: number | null; titelbild: string | null }
  anfrage: { id: string; flaeche_min: number | null; flaeche_max: number | null; letzter_kontakt: string }
  firma: { name: string; website: string | null } | null
  // Offener Angebots-Entwurf -> Übersicht zeigt "Entwurf öffnen" statt "Angebot entwerfen".
  hatEntwurf: boolean
  // Gesetzt bei einem 'neu'-Treffer: früher angeboten und abgesagt, nach "wieder verfügbar" neu.
  angeboten_am: string | null
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
      .select("*, objekte(titel, adresse, flaeche, preis_pro_m2, foto_url, archiviert_am)")
      .eq("status", "neu")
      .order("score", { ascending: false }),
    supabase.from("anfragen").select("id, firma_id, flaeche_min, flaeche_max, letzter_kontakt").is("archiviert_am", null),
    supabase.from("firmen").select("id, name, website"),
  ])
  if (matchError) throw matchError
  if (anfragenError) throw anfragenError
  if (firmenError) throw firmenError

  const anfragenNachId = new Map(anfragenData.map((a) => [a.id, a]))
  const firmenNachId = new Map(firmenData.map((f) => [f.id, f]))
  // Archivierte Anfrage oder archiviertes Objekt: Treffer ausblenden. Neue 'neu'-Treffer
  // dazu entstehen nicht mehr, alte Zeilen und Races aber schon.
  const sichtbar = matchRows.filter((m) => anfragenNachId.has(m.anfrage_id) && m.objekte && !m.objekte.archiviert_am)
  const titelbilder = await holeTitelbilder(sichtbar.map((m) => m.objekt_id))
  // Eine Abfrage über alle gelisteten match_ids statt einer pro Karte.
  const entwurfIds = await holeMatchIdsMitOffenemEntwurf(sichtbar.map((m) => m.id))

  return sichtbar.flatMap((m) => {
    const anfrage = anfragenNachId.get(m.anfrage_id)
    if (!anfrage || !m.objekte) return []
    const { titel, adresse, flaeche, preis_pro_m2, foto_url } = m.objekte
    const { firma_id, ...anfrageDaten } = anfrage
    return [
      {
        id: m.id,
        score: m.score,
        kriterien: m.kriterien as Kriterium[],
        hinweis: m.hinweis,
        objekt: { titel, adresse, flaeche, preis_pro_m2, titelbild: titelbilder[m.objekt_id] ?? foto_url },
        anfrage: anfrageDaten,
        firma: firma_id ? (firmenNachId.get(firma_id) ?? null) : null,
        hatEntwurf: entwurfIds.has(m.id),
        angeboten_am: m.angeboten_am,
      },
    ]
  })
}
