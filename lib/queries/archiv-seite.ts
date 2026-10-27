// Daten der Archiv-Seite: archivierte Objekte/Anfragen und alle Treffer-Archiveinträge.
// treffer_archiv hat keine Fremdschlüssel (die Kopie soll das Original überleben), darum
// werden Firmen- und Objektnamen über Nachschlage-Maps aufgelöst statt eingebettet.
import "server-only"
import { erstelleServerClient } from "@/lib/supabase/server"
import { anfrageKurz } from "@/lib/eingang/zuordnung"
import type { ArchivDaten } from "@/lib/archiv/typen"

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

function zaehle(ids: string[]): Map<string, number> {
  const anzahl = new Map<string, number>()
  for (const id of ids) anzahl.set(id, (anzahl.get(id) ?? 0) + 1)
  return anzahl
}

export async function holeArchiv(): Promise<ArchivDaten> {
  const supabase = await erstelleServerClient()

  async function holeTrefferArchiv() {
    const zeilen = []
    for (let von = 0; ; von += SEITE) {
      const { data, error } = await supabase
        .from("treffer_archiv")
        .select("id, anfrage_id, objekt_id, status, score, angeboten_am, archiviert_am, grund")
        .order("archiviert_am", { ascending: false })
        .order("id")
        .range(von, von + SEITE - 1)
      if (error) throw error
      zeilen.push(...data)
      if (data.length < SEITE) return zeilen
    }
  }

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

  const [weitereObjekte, weitereAnfragen, fotos] = await Promise.all([
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
    // Eine gruppierbare Liste statt einer Zählung je Objekt (kein N+1).
    jePortion(objekte.map((o) => o.id), async (p) => {
      const { data, error } = await supabase.from("objekt_fotos").select("objekt_id").in("objekt_id", p)
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
    })),
  }
}
