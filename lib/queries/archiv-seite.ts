// Daten der Archiv-Seite: archivierte Objekte/Anfragen und alle Treffer-Archiveinträge.
// treffer_archiv hat keine Fremdschlüssel (die Kopie soll das Original überleben), darum
// werden Firmen- und Objektnamen über Nachschlage-Maps aufgelöst statt eingebettet.
import "server-only"
import { erstelleServerClient } from "@/lib/supabase/server"
import { anfrageKurz } from "@/lib/eingang/zuordnung"
import type { ArchivDaten } from "@/lib/archiv/typen"
import { alleSeiten } from "./seiten"

// Kurze id-Listen je Anfrage, damit der in-Filter in der URL nicht zu lang wird.
const PORTION = 50
// PostgREST liefert höchstens 1000 Zeilen je Anfrage; treffer_archiv wächst über Jahre.
const SEITE = 1000

async function jePortion<T>(ids: string[], laden: (portion: string[]) => Promise<T[]>): Promise<T[]> {
  const eindeutig = [...new Set(ids)]
  const teile: Promise<T[]>[] = []
  for (let i = 0; i < eindeutig.length; i += PORTION) teile.push(laden(eindeutig.slice(i, i + PORTION)))
  return (await Promise.all(teile)).flat()
}

// Für Zähl-Listen (Fotos, Treffer je Datensatz): eine Portion kann über 1000 Zeilen haben,
// darum innerhalb jeder Portion seitenweise, sonst würde still abgeschnitten.
async function jePortionSeitenweise<T>(
  ids: string[],
  laden: (portion: string[], von: number, bis: number) => Promise<T[]>,
): Promise<T[]> {
  return jePortion(ids, async (portion) => {
    const alle: T[] = []
    for (let von = 0; ; von += SEITE) {
      const seite = await laden(portion, von, von + SEITE - 1)
      alle.push(...seite)
      if (seite.length < SEITE) return alle
    }
  })
}

function zaehle(ids: string[]): Map<string, number> {
  const anzahl = new Map<string, number>()
  for (const id of ids) anzahl.set(id, (anzahl.get(id) ?? 0) + 1)
  return anzahl
}

export async function holeArchiv(): Promise<ArchivDaten> {
  const supabase = await erstelleServerClient()

  const holeTrefferArchiv = () =>
    alleSeiten((von, bis) =>
      supabase
        .from("treffer_archiv")
        .select("id, anfrage_id, objekt_id, status, score, angeboten_am, archiviert_am, grund")
        .order("archiviert_am", { ascending: false })
        .order("id")
        .range(von, bis)
    )

  // Archivierte Objekte/Anfragen ungeblättert: es werden deutlich unter 1000 erwartet
  // (kleiner Bestand, Archivieren ist eine bewusste Einzelaktion); Treffer dagegen seitenweise.
  const [treffer, objekteErg, anfragenErg] = await Promise.all([
    holeTrefferArchiv(),
    supabase
      .from("objekte")
      .select("id, titel, ort, nutzung, flaeche, status, archiviert_am, archiv_grund")
      .not("archiviert_am", "is", null)
      .order("archiviert_am", { ascending: false }),
    supabase
      .from("anfragen")
      .select("id, firma_id, nutzung, flaeche_min, flaeche_max, ort, budget_pro_m2, bezug, status, archiviert_am, archiv_grund")
      .not("archiviert_am", "is", null)
      .order("archiviert_am", { ascending: false }),
  ])
  if (objekteErg.error) throw objekteErg.error
  if (anfragenErg.error) throw anfragenErg.error
  const objekte = objekteErg.data
  const anfragen = anfragenErg.data

  // Treffer verweisen auch auf aktive Objekte/Anfragen: nur die noch unbekannten nachladen.
  const objektTitel = new Map(objekte.map((o) => [o.id, o.titel]))
  const anfrageFirma = new Map(anfragen.map((a) => [a.id, a.firma_id]))
  const fehlendeObjekte = treffer.map((t) => t.objekt_id).filter((id) => !objektTitel.has(id))
  const fehlendeAnfragen = treffer.map((t) => t.anfrage_id).filter((id) => !anfrageFirma.has(id))

  const [weitereObjekte, weitereAnfragen, fotos, objektMatches, anfrageMatches] = await Promise.all([
    jePortion(fehlendeObjekte, async (p) => {
      const { data, error } = await supabase.from("objekte").select("id, titel").in("id", p)
      if (error) throw error
      return data
    }),
    jePortion(fehlendeAnfragen, async (p) => {
      const { data, error } = await supabase.from("anfragen").select("id, firma_id").in("id", p)
      if (error) throw error
      return data
    }),
    // Gruppierbare Listen statt einer Zählung je Datensatz (kein N+1).
    jePortionSeitenweise(objekte.map((o) => o.id), async (p, von, bis) => {
      const { data, error } = await supabase.from("objekt_fotos").select("objekt_id").in("objekt_id", p).order("id").range(von, bis)
      if (error) throw error
      return data
    }),
    // Noch vorhandene Treffer (vermittelt, abgelehnt, …) löscht die Kaskade ohne Archiv mit (Ruling R4).
    jePortionSeitenweise(objekte.map((o) => o.id), async (p, von, bis) => {
      const { data, error } = await supabase.from("matches").select("objekt_id").in("objekt_id", p).order("id").range(von, bis)
      if (error) throw error
      return data
    }),
    jePortionSeitenweise(anfragen.map((a) => a.id), async (p, von, bis) => {
      const { data, error } = await supabase.from("matches").select("anfrage_id").in("anfrage_id", p).order("id").range(von, bis)
      if (error) throw error
      return data
    }),
  ])
  for (const o of weitereObjekte) objektTitel.set(o.id, o.titel)
  for (const a of weitereAnfragen) anfrageFirma.set(a.id, a.firma_id)

  const firmaIds = [...anfrageFirma.values()].filter((id): id is string => id !== null)
  const firmen = await jePortion(firmaIds, async (p) => {
    const { data, error } = await supabase.from("firmen").select("id, name").in("id", p)
    if (error) throw error
    return data
  })
  const firmaName = new Map(firmen.map((f) => [f.id, f.name]))
  const firmaVonAnfrage = (anfrageId: string): string | null => {
    const firmaId = anfrageFirma.get(anfrageId)
    return firmaId ? (firmaName.get(firmaId) ?? null) : null
  }

  const trefferJeObjekt = zaehle(treffer.map((t) => t.objekt_id))
  const trefferJeAnfrage = zaehle(treffer.map((t) => t.anfrage_id))
  const fotosJeObjekt = zaehle(fotos.map((f) => f.objekt_id))
  const matchesJeObjekt = zaehle(objektMatches.map((m) => m.objekt_id))
  const matchesJeAnfrage = zaehle(anfrageMatches.map((m) => m.anfrage_id))

  return {
    treffer: treffer.map((t) => ({
      id: t.id,
      firma: firmaVonAnfrage(t.anfrage_id),
      objekt: objektTitel.get(t.objekt_id) ?? null,
      status: t.status,
      score: t.score,
      angeboten_am: t.angeboten_am,
      archiviert_am: t.archiviert_am,
      grund: t.grund,
    })),
    // Der Filter oben garantiert archiviert_am; der generierte Typ weiss das nicht.
    objekte: objekte.map((o) => ({
      id: o.id,
      titel: o.titel,
      ort: o.ort,
      nutzung: o.nutzung,
      flaeche: o.flaeche,
      status: o.status,
      archiviert_am: o.archiviert_am ?? "",
      grund: o.archiv_grund,
      trefferAnzahl: trefferJeObjekt.get(o.id) ?? 0,
      abgeschlossenAnzahl: matchesJeObjekt.get(o.id) ?? 0,
      fotoAnzahl: fotosJeObjekt.get(o.id) ?? 0,
    })),
    anfragen: anfragen.map((a) => ({
      id: a.id,
      firma: firmaVonAnfrage(a.id),
      eckdaten: anfrageKurz(a),
      status: a.status,
      archiviert_am: a.archiviert_am ?? "",
      grund: a.archiv_grund,
      trefferAnzahl: trefferJeAnfrage.get(a.id) ?? 0,
      abgeschlossenAnzahl: matchesJeAnfrage.get(a.id) ?? 0,
    })),
  }
}
