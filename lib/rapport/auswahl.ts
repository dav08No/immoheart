// Welche Rohzeilen in den Rapport gehören (Spec "Zeitraum-Regeln"). Die Queries laden
// grosszügig, die genaue Zürcher Tagesgrenze zieht erst diese reine Funktion.
import type { Database } from "@/types/database"
import type { RapportRohdaten, RohAnfrage, RohAngebot, RohObjekt } from "./roh"
import { imZeitraum, type RapportZeitraum } from "./zeitraum"

type TrefferStatus = Database["public"]["Enums"]["match_status_enum"]

export type TrefferEintrag = {
  quelle: "aktiv" | "archiv"
  matchId: string
  anfrageId: string
  objektId: string
  status: TrefferStatus // bei Archiv: Status beim Archivieren
  score: number
  erstellt: string
  archiviertAm: string | null
  grund: string | null
}

export type Vermittlung = { matchId: string; anfrageId: string; objektId: string; abgeschlossenAm: string }

export type RapportAuswahl = {
  neueAnfragen: RohAnfrage[]
  anfragen: RohAnfrage[]
  neueObjekte: RohObjekt[]
  objekte: RohObjekt[]
  neueTreffer: TrefferEintrag[]
  trefferZeilen: TrefferEintrag[]
  angebote: RohAngebot[]
  vermittlungen: Vermittlung[]
}

type Zeitraum = Pick<RapportZeitraum, "von" | "bis">

function nachZeit<T>(liste: T[], zeit: (x: T) => string): T[] {
  // sort() ist stabil: gleiche Zeitpunkte behalten ihre Eingangsreihenfolge.
  return [...liste].sort((a, b) => Date.parse(zeit(a)) - Date.parse(zeit(b)))
}

export const paarSchluessel = (anfrageId: string | null, objektId: string | null) => `${anfrageId ?? ""}|${objektId ?? ""}`

// Archivieren löscht die Zeile, ein Rematching legt eine neue id an: derselbe Treffer
// (Paar Anfrage/Objekt) hat also mehrere match_ids. Darum je Paar einmal (R7):
// die aktive Zeile gewinnt, sonst der jüngste Archiveintrag.
function jePaar(eintraege: TrefferEintrag[]): TrefferEintrag[] {
  const gewaehlt = new Map<string, TrefferEintrag>()
  for (const t of eintraege) {
    const schluessel = paarSchluessel(t.anfrageId, t.objektId)
    const bisher = gewaehlt.get(schluessel)
    const besser =
      !bisher ||
      (bisher.quelle === "archiv" && t.quelle === "aktiv") ||
      (bisher.quelle === "archiv" && t.quelle === "archiv" && Date.parse(t.archiviertAm ?? "") > Date.parse(bisher.archiviertAm ?? ""))
    if (besser) gewaehlt.set(schluessel, t)
  }
  return [...gewaehlt.values()]
}

export function waehleAus(roh: RapportRohdaten, z: Zeitraum): RapportAuswahl {
  const erstelltOderArchiviert = (x: { created_at: string; archiviert_am: string | null }) =>
    imZeitraum(z, x.created_at) || imZeitraum(z, x.archiviert_am)

  const aktiv: TrefferEintrag[] = roh.treffer
    .filter((t) => imZeitraum(z, t.created_at))
    .map((t) => ({
      quelle: "aktiv", matchId: t.id, anfrageId: t.anfrage_id, objektId: t.objekt_id, status: t.status,
      score: t.score, erstellt: t.created_at, archiviertAm: null, grund: null,
    }))
  const archiv: TrefferEintrag[] = roh.trefferArchiv
    .filter((t) => imZeitraum(z, t.treffer_erstellt_am) || imZeitraum(z, t.archiviert_am))
    .map((t) => ({
      quelle: "archiv", matchId: t.match_id, anfrageId: t.anfrage_id, objektId: t.objekt_id, status: t.status,
      score: t.score, erstellt: t.treffer_erstellt_am, archiviertAm: t.archiviert_am, grund: t.grund,
    }))

  const neueTreffer = jePaar([...aktiv, ...archiv].filter((t) => imZeitraum(z, t.erstellt)))

  // Vermittelte Treffer werden nicht archiviert; eine Archivzeile "vermittelt" ist eine eigene
  // Episode (eigene match_id), darum kein Abgleich nötig.
  const vermittlungen: Vermittlung[] = [...roh.treffer.map((x) => ({ ...x, match_id: x.id })), ...roh.trefferArchiv].flatMap((t) =>
    t.status === "vermittelt" && t.abgeschlossen_am && imZeitraum(z, t.abgeschlossen_am)
      ? [{ matchId: t.match_id, anfrageId: t.anfrage_id, objektId: t.objekt_id, abgeschlossenAm: t.abgeschlossen_am }]
      : []
  )

  return {
    neueAnfragen: nachZeit(roh.anfragen.filter((a) => imZeitraum(z, a.created_at)), (a) => a.created_at),
    anfragen: nachZeit(roh.anfragen.filter(erstelltOderArchiviert), (a) => a.created_at),
    neueObjekte: nachZeit(roh.objekte.filter((o) => imZeitraum(z, o.created_at)), (o) => o.created_at),
    objekte: nachZeit(roh.objekte.filter(erstelltOderArchiviert), (o) => o.created_at),
    neueTreffer: nachZeit(neueTreffer, (t) => t.erstellt),
    trefferZeilen: nachZeit(jePaar([...aktiv, ...archiv]), (t) => t.erstellt),
    // Ohne Anfrage = endgültig gelöscht (R6): zählt weder in Kachel, Diagramm noch Tabelle.
    angebote: nachZeit(roh.angebote.filter((a) => a.anfrage_id !== null && imZeitraum(z, a.gesendet_am)), (a) => a.gesendet_am ?? ""),
    vermittlungen: nachZeit(vermittlungen, (v) => v.abgeschlossenAm),
  }
}

export type Nachschlagen = {
  firma: (anfrageId: string | null) => string | null
  anfrage: (id: string | null) => RohAnfrage | null
  objekt: (id: string | null) => RohObjekt | null
}

// treffer_archiv hat keine Fremdschlüssel: Namen kommen aus Maps statt aus Embeddings.
export function nachschlagen(roh: RapportRohdaten): Nachschlagen {
  const firmen = new Map(roh.firmen.map((f) => [f.id, f.name]))
  const anfragen = new Map(roh.anfragen.map((a) => [a.id, a]))
  const objekte = new Map(roh.objekte.map((o) => [o.id, o]))
  const anfrage = (id: string | null) => (id ? (anfragen.get(id) ?? null) : null)
  return {
    anfrage,
    objekt: (id) => (id ? (objekte.get(id) ?? null) : null),
    firma: (anfrageId) => {
      const firmaId = anfrage(anfrageId)?.firma_id
      return firmaId ? (firmen.get(firmaId) ?? null) : null
    },
  }
}
