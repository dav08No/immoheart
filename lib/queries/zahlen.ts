// Kennzahlen der Admin-Seite /admin/zahlen: je Tabelle eine schlanke Abfrage (nur die
// Spalten, die die Aggregationen in lib/zahlen/ brauchen), alles Rechnen passiert dort.
import "server-only"
import { erstelleServerClient } from "@/lib/supabase/server"
import { erstelleAdminClient } from "@/lib/supabase/admin"
import {
  abschluesseJeAnfrage,
  anfragenProMonat,
  tageBisAbschluss,
  tageBisErstangebot,
  topObjekte,
  vermittlungsquote,
} from "@/lib/zahlen/anfragen"
import { entwuerfeVerlauf, mailsProWoche } from "@/lib/zahlen/nachrichten"
import { groessenVerteilung, nutzungVerteilung, pulsVerteilung } from "@/lib/zahlen/verteilungen"
import { erstesAngebotJeAnfrage } from "@/lib/zahlen/anzeige"

// PostgREST liefert höchstens 1000 Zeilen je Anfrage -- darüber hinaus seitenweise.
const SEITE = 1000

async function alleSeiten<T>(
  hole: (von: number, bis: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const alle: T[] = []
  for (let von = 0; ; von += SEITE) {
    const { data, error } = await hole(von, von + SEITE - 1)
    if (error) throw error
    const seite = data ?? []
    alle.push(...seite)
    if (seite.length < SEITE) return alle
  }
}

export type ZahlenDaten = {
  anfragen: { gesamt: number; offen: number; quote: number | null; vermittelt: number }
  erstangebot: { median: number | null; anzahl: number }
  abschluss: { median: number | null; anzahl: number }
  proMonat: ReturnType<typeof anfragenProMonat>
  mails: ReturnType<typeof mailsProWoche>
  entwuerfe: ReturnType<typeof entwuerfeVerlauf>
  topObjekte: ReturnType<typeof topObjekte>
  groessen: ReturnType<typeof groessenVerteilung>
  nutzung: ReturnType<typeof nutzungVerteilung>
  puls: ReturnType<typeof pulsVerteilung>
}

// `jetzt` kommt vom Aufrufer, damit alle Zeitfenster denselben Stichtag haben.
export async function holeZahlen(jetzt: Date): Promise<ZahlenDaten> {
  const supabase = await erstelleServerClient()
  const [anfragen, nachrichten, treffer] = await Promise.all([
    alleSeiten((von, bis) =>
      supabase
        .from("anfragen")
        .select("id, created_at, quelle, status, flaeche_min, flaeche_max, nutzung, letzter_kontakt")
        .order("id")
        .range(von, bis)
    ),
    alleSeiten((von, bis) =>
      supabase
        .from("nachrichten")
        .select("richtung, typ, kategorie, quelle, objekt_id, anfrage_id, created_at, empfangen_am, gesendet_am, geloescht_am")
        .order("id")
        .range(von, bis)
    ),
    // Nur Treffer, die je angeboten wurden: sie tragen angeboten_am bzw. abgeschlossen_am.
    alleSeiten((von, bis) =>
      supabase
        .from("matches")
        .select("anfrage_id, status, angeboten_am, abgeschlossen_am")
        .not("angeboten_am", "is", null)
        .order("id")
        .range(von, bis)
    ),
  ])

  const offene = anfragen.filter((a) => a.status === "offen")
  // Gelöschte Nachrichten zählen nur bei den Entwürfen ("gelöscht" ist dort die Kennzahl)
  // und beim Versand (ein gesendetes Angebot bleibt gesendet, auch wenn es später aus
  // dem Postfach entfernt wird).
  const sichtbar = nachrichten.filter((n) => n.geloescht_am === null)
  const direkt = sichtbar.filter((n) => n.kategorie === "objektanfrage" && n.richtung === "eingang")
  const erstellt = Object.fromEntries(anfragen.map((a) => [a.id, a.created_at]))
  // angeboten_am wird beim tatsächlichen Versand gesetzt (Spec §3) -- verlässlicher als
  // gesendete Angebots-Mails, die gelöscht oder von Hand verschickt sein können.
  const angebote = treffer.map((t) => ({ anfrage_id: t.anfrage_id, gesendet_am: t.angeboten_am }))
  const erstangebot = tageBisErstangebot(erstesAngebotJeAnfrage(angebote, erstellt))
  const abschluss = tageBisAbschluss(abschluesseJeAnfrage(treffer, erstellt))
  const { quote, vermittelt, gesamt } = vermittlungsquote(anfragen)

  return {
    anfragen: { gesamt, offen: offene.length, quote, vermittelt },
    erstangebot: { median: erstangebot.median, anzahl: erstangebot.anzahl },
    abschluss: { median: abschluss.median, anzahl: abschluss.anzahl },
    proMonat: anfragenProMonat(anfragen, jetzt, 12),
    mails: mailsProWoche(sichtbar, jetzt, 12),
    entwuerfe: entwuerfeVerlauf(nachrichten, jetzt, 6),
    topObjekte: await mitObjektTiteln(direkt),
    // Grössen, Nutzungen und Puls beschreiben die aktuelle Nachfrage -> nur offene Anfragen.
    groessen: groessenVerteilung(offene),
    nutzung: nutzungVerteilung(offene),
    puls: pulsVerteilung(offene, jetzt),
  }
}

// Erst zählen (ohne Titel liefert topObjekte die ID als Titel), dann nur die Titel der
// höchstens fünf Gewinner laden statt aller Objekte.
async function mitObjektTiteln(direkt: { objekt_id: string | null }[]): Promise<ZahlenDaten["topObjekte"]> {
  const ids = topObjekte(direkt, {}).map((t) => t.titel)
  if (ids.length === 0) return []
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("objekte").select("id, titel").in("id", ids)
  if (error) throw error
  return topObjekte(direkt, Object.fromEntries(data.map((o) => [o.id, o.titel])))
}

// speicher_belegt() ist nur für service_role freigegeben (liest storage.objects).
// Aufrufer MUSS vorher holeEigenesProfil() geprüft haben.
export async function holeSpeicher(): Promise<{ bucket: string; bytes: number }[]> {
  const { data, error } = await erstelleAdminClient().rpc("speicher_belegt")
  if (error) throw error
  return data.map((z) => ({ bucket: z.bucket, bytes: Number(z.bytes) }))
}
