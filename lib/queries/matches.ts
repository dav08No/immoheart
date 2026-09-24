import { erstelleServerClient } from "@/lib/supabase/server"
import { berechneMatch } from "@/lib/matching"
import { holeAnfrage, holeOffeneAnfragen, zuAnfrageDomain } from "@/lib/queries/anfragen"
import { holeObjekt, holeVerfuegbareObjekte, zuObjektDomain } from "@/lib/queries/objekte"
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
// mit der in diesem Milestone durchgehend eingehaltenen Regel "keine
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

// Gemeinsame Maskierungslogik für holeBesterMatchFuerAnfrage (unten) und
// holeNeueMatches (Task 60): beide lesen dieselbe kriterien/hinweis-Form aus
// derselben ungefilterten `matches`-Zeile und müssen für einen leser, der
// eine vertrauliche Anfrage betrachtet, identisch maskieren -- siehe den
// "Kritischer Fund"-Kommentar oben für die vollständige Begründung (warum
// `status`/`hinweis` zusätzlich zu `gesucht` betroffen sind). Zwei reale
// Aufrufer mit exakt identischer Logik auf derselben Datenform ist laut
// README-Coderegel ("keine Abstraktion vor der dritten Wiederholung") schon
// die zweite Wiederholung, nicht die dritte -- hier aber bewusst trotzdem
// extrahiert, weil es sich um sicherheitsrelevanten Code handelt: zwei
// Kopien derselben Maskierung würden bei einer künftigen Änderung (z.B. ein
// fünfter PREIS_HINWEISE-Text) leicht auseinanderlaufen, und genau ein
// vergessener Kopierpfad ist die Art Fehler, die diese Funktion verhindern soll.
function maskierePreisFuerVertraulicheAnfrage(
  kriterien: Kriterium[],
  hinweis: string
): { kriterien: Kriterium[]; hinweis: string } {
  const maskierteKriterien = kriterien.map((k) =>
    k.kriterium === "Preis" ? { ...k, gesucht: BUDGET_MASKIERT, status: "teilweise" as const } : k
  )
  const maskierterHinweis = PREIS_HINWEISE.has(hinweis) ? BUDGET_HINWEIS_MASKIERT : hinweis
  return { kriterien: maskierteKriterien, hinweis: maskierterHinweis }
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
  if (!data) return data

  const [profil, { data: anfrageSichtbar, error: anfrageError }] = await Promise.all([
    holeEigenesProfil(),
    supabase.from("anfragen_sichtbar").select("vertraulich").eq("id", anfrageId).maybeSingle(),
  ])
  if (anfrageError) throw anfrageError

  if (profil.rolle === "leser" && anfrageSichtbar?.vertraulich) {
    const { kriterien, hinweis } = maskierePreisFuerVertraulicheAnfrage(data.kriterien as unknown as Kriterium[], data.hinweis)
    return { ...data, kriterien, hinweis }
  }

  return data
}

// Task 60 (Matches-Startseite): proaktiv vor der formalen Whole-Branch-Review
// gefundener und behobener Fund derselben Schwere-Klasse wie der
// "Kritischer Fund (M6 Whole-Branch-Review)"-Kommentar oben, hier sogar mit
// grösserer Reichweite. Der Planungsentwurf für diese Funktion selektierte
// `matches.*` (inkl. der rohen, RLS-unbeschränkten kriterien-Spalte) für
// JEDEN status='neu'-Match im GESAMTEN System und gab ihn ungefiltert als
// NeuerMatch[] zurück -- die Dashboard-Startseite, die JEDE eingeloggte
// Rolle inkl. leser beim Login zu sehen bekommt. Ohne Maskierung hätte ein
// leser damit beim blossen Laden von "/" das echte Budget jeder vertraulichen
// Anfrage im Klartext gesehen (über das Preis-Kriterium jedes betroffenen
// Matches) -- eine grössere Angriffsfläche als der ursprüngliche M6-Fund, der
// noch das gezielte Öffnen eines einzelnen Anfrage-Drawers voraussetzte. Der
// Planungskommentar zu dieser Funktion deckt nur die Firmennamen-Maskierung
// ab (über anfragen_sichtbar statt eines rohen anfragen(firmen(name))-Embeds);
// die kriterien-Maskierung fehlte dort vollständig und wird hier nachgerüstet,
// mit derselben maskierePreisFuerVertraulicheAnfrage-Logik wie oben, pro Zeile
// angewendet (statt einmalig wie bei holeBesterMatchFuerAnfrage, da diese
// Funktion ein Array über mehrere Anfragen liefert statt eines einzelnen
// Matches).
export type NeuerMatch = {
  id: string
  score: number
  kriterien: Kriterium[]
  hinweis: string
  objekt: { titel: string; adresse: string; flaeche: number; preis_pro_m2: number | null; foto_url: string | null }
  anfrage: { id: string; flaeche_min: number | null; flaeche_max: number | null; letzter_kontakt: string; vertraulich: boolean }
  firma: { name: string; website: string | null } | null
}

export async function holeNeueMatches(): Promise<NeuerMatch[]> {
  const supabase = await erstelleServerClient()
  const { data: matchRows, error: matchError } = await supabase
    .from("matches")
    .select("*, objekte(titel, adresse, flaeche, preis_pro_m2, foto_url)")
    .eq("status", "neu")
    .order("score", { ascending: false })
  if (matchError) throw matchError

  const [profil, { data: anfragenData, error: anfragenError }, { data: firmenData, error: firmenError }] = await Promise.all([
    holeEigenesProfil(),
    supabase.from("anfragen_sichtbar").select("*"),
    supabase.from("firmen").select("id, name, website"),
  ])
  if (anfragenError) throw anfragenError
  if (firmenError) throw firmenError

  const anfragenNachId = new Map(anfragenData.map((a) => [a.id, a]))
  const firmenNachId = new Map(firmenData.map((f) => [f.id, f]))

  return matchRows.flatMap((m) => {
    const anfrage = anfragenNachId.get(m.anfrage_id)
    // anfragen_sichtbar ist eine View: alle Spalten sind laut generiertem Typ
    // nullable, obwohl id/letzter_kontakt/vertraulich in der Basistabelle NOT
    // NULL sind (gleiches Muster wie in AnfragenTabelle.tsx/AnfrageDetail.tsx
    // dokumentiert). Eine Zeile ohne id/letzter_kontakt kann es praktisch nicht
    // geben; defensiv überspringen statt wegzucasten.
    if (!anfrage || anfrage.id === null || anfrage.letzter_kontakt === null || !m.objekte) return []
    const firma = anfrage.firma_id ? (firmenNachId.get(anfrage.firma_id) ?? null) : null

    // vertraulich ist selbst nicht geheim (die View gibt das Flag für jede
    // Rolle unmaskiert zurück, siehe supabase/migrations/20260922195659_rls.sql)
    // -- nur budget_pro_m2/firma_id werden für leser+vertraulich in der View
    // bereits zu null maskiert. Was die View NICHT maskiert, ist die rohe
    // matches.kriterien-Spalte weiter unten -- deshalb hier zusätzlich maskieren.
    const istVertraulichFuerLeser = profil.rolle === "leser" && anfrage.vertraulich === true
    const { kriterien, hinweis } = istVertraulichFuerLeser
      ? maskierePreisFuerVertraulicheAnfrage(m.kriterien as unknown as Kriterium[], m.hinweis)
      : { kriterien: m.kriterien as Kriterium[], hinweis: m.hinweis }

    return [
      {
        id: m.id,
        score: m.score,
        kriterien,
        hinweis,
        objekt: m.objekte,
        anfrage: {
          id: anfrage.id,
          flaeche_min: anfrage.flaeche_min,
          flaeche_max: anfrage.flaeche_max,
          letzter_kontakt: anfrage.letzter_kontakt,
          vertraulich: anfrage.vertraulich ?? false,
        },
        firma,
      },
    ]
  })
}
