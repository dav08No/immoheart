// Reine Postfach-Logik (Filter, Zähler, Badges, welcher Aktionsblock) ohne React und
// ohne DB -- so testbar ohne Rendering, siehe postfach.test.ts.
import type { ObjektDaten } from "@/lib/ki/einordnung"
import { istFotoMime } from "@/lib/objekt-fotos"
import type { Database, Json } from "@/types/database"

type Tabellen = Database["public"]["Tables"]
type Nachricht = Tabellen["nachrichten"]["Row"]
type Kategorie = Database["public"]["Enums"]["nachricht_kategorie_enum"]

export type PostfachFilter = "alle" | "eingang" | "website" | "gesendet"
export type KategorieChip = Kategorie
export type AktionsBlock = Exclude<Kategorie, "sonstiges"> | null
export type KiAnzeige = "wartet" | "laeuft" | "fehler" | null

export const KATEGORIE_CHIPS: { wert: KategorieChip; label: string }[] = [
  { wert: "suchanfrage", label: "Suchanfrage" },
  { wert: "antwort", label: "Antwort" },
  { wert: "objektangebot", label: "Objektangebot" },
  { wert: "objektanfrage", label: "Objektanfrage" },
  { wert: "objektmeldung", label: "Objektmeldung" },
  { wert: "sonstiges", label: "Sonstiges" },
]

type Filterbar = Pick<Nachricht, "richtung" | "quelle" | "kategorie">

// Für jede DB-Kategorie gibt es einen eigenen Chip (seit N5 Objektanfrage, seit dem
// Abschluss-Feature Objektmeldung).
export function chipVon(kategorie: Kategorie | null): KategorieChip | null {
  return kategorie
}

export function passtZuFilter(n: Filterbar, filter: PostfachFilter): boolean {
  if (filter === "alle") return true
  if (filter === "gesendet") return n.richtung === "gesendet"
  if (n.richtung !== "eingang") return false
  return filter === "website" ? n.quelle === "website" : n.quelle !== "website"
}

export function filtereNachrichten<T extends Filterbar>(
  nachrichten: T[],
  filter: PostfachFilter,
  chip: KategorieChip | null
): T[] {
  return nachrichten.filter((n) => passtZuFilter(n, filter) && (chip === null || chipVon(n.kategorie) === chip))
}

// Gezählt wird innerhalb des gewählten Filters, damit die Zahl am Chip zur Liste passt.
export function zaehleChips(nachrichten: Filterbar[], filter: PostfachFilter): Record<KategorieChip, number> {
  const zaehler: Record<KategorieChip, number> = {
    suchanfrage: 0,
    antwort: 0,
    objektangebot: 0,
    objektanfrage: 0,
    objektmeldung: 0,
    sonstiges: 0,
  }
  for (const n of nachrichten) {
    const chip = chipVon(n.kategorie)
    if (chip && passtZuFilter(n, filter)) zaehler[chip] += 1
  }
  return zaehler
}

export function anhangBadges(mimeTypes: string[]): string[] {
  const bilder = mimeTypes.filter((m) => m.startsWith("image/")).length
  const pdfs = mimeTypes.filter((m) => m === "application/pdf").length
  const badges: string[] = []
  if (bilder > 0) badges.push(bilder === 1 ? "1 Bild" : `${bilder} Bilder`)
  if (pdfs > 0) badges.push(pdfs === 1 ? "PDF" : `${pdfs} PDFs`)
  return badges
}

export function istUngelesen(n: Pick<Nachricht, "richtung" | "gelesen">): boolean {
  return n.richtung === "eingang" && !n.gelesen
}

export function kiAnzeige(kiStatus: string | null): KiAnzeige {
  if (kiStatus === "offen") return "wartet"
  if (kiStatus === "laeuft" || kiStatus === "fehler") return kiStatus
  return null
}

// Solange die KI noch arbeitet, keine Aktionen: sie würden auf halbfertigen Feldern
// arbeiten. Altdaten ohne KI (ki_status null, kategorie null) mit erkannten Feldern
// stammen aus dem früheren "Mail einfügen" und sind Suchanfragen.
export function aktionsBlock(
  n: Pick<Nachricht, "richtung" | "kategorie" | "ki_status" | "erkannte_felder">
): AktionsBlock {
  if (n.richtung !== "eingang") return null
  if (n.ki_status === "offen" || n.ki_status === "laeuft") return null
  if (n.kategorie === null) return n.erkannte_felder !== null ? "suchanfrage" : null
  return n.kategorie === "sonstiges" ? null : n.kategorie
}

export type SuchanfrageKopf = { ueberschrift: string; rueckfrage: boolean }

// Website-Suchaufträge kommen strukturiert aus dem Formular: leere optionale Felder sind
// keine "Lücke" der Erkennung, und der einzige Entwurf dazu ist der Danke-Entwurf
// ("Entwurf öffnen") -- eine Rückfrage gibt es dort nicht.
export function suchanfrageKopf(quelle: Nachricht["quelle"], felder: object): SuchanfrageKopf {
  if (quelle === "website") return { ueberschrift: "Angaben aus dem Formular", rueckfrage: false }
  const luecken = Object.values(felder).filter((wert) => wert === null).length
  return { ueberschrift: `immoheart hat erkannt${luecken > 0 ? ` · ${luecken} fehlt` : ""}`, rueckfrage: luecken > 0 }
}

export type FotoUebernahme = "moeglich" | "heic" | "nein"

// HEIC/HEIF bekommt einen eigenen Hinweis statt still zu fehlen: iPhones schicken das oft.
export function fotoUebernahme(mime: string): FotoUebernahme {
  if (istFotoMime(mime)) return "moeglich"
  return mime === "image/heic" || mime === "image/heif" ? "heic" : "nein"
}

// anhaenge ist Json (string[] laut Abruf); defensiv gelesen, weil jsonb alles halten kann.
export function nichtGespeicherteAnhaenge(anhaenge: Json): string[] {
  return Array.isArray(anhaenge) ? anhaenge.filter((a): a is string => typeof a === "string") : []
}

export function objektDatenAus(erkannteFelder: Json | null): ObjektDaten | null {
  if (!erkannteFelder || typeof erkannteFelder !== "object" || Array.isArray(erkannteFelder)) return null
  const objekt = erkannteFelder.objekt
  if (!objekt || typeof objekt !== "object" || Array.isArray(objekt)) return null
  return objekt as ObjektDaten
}

export type AbrufAnzeige = { erfolgAm: string | null; fehler: { text: string; am: string } | null }

// Ein alter Fehler, nach dem schon wieder erfolgreich abgerufen wurde, ist erledigt und
// wird nicht mehr rot angezeigt.
export function abrufAnzeige(s: {
  letzterErfolg: string | null
  letzterFehler: string | null
  letzterFehlerAm: string | null
}): AbrufAnzeige {
  const { letzterErfolg, letzterFehler, letzterFehlerAm } = s
  if (letzterFehler === null || letzterFehlerAm === null) return { erfolgAm: letzterErfolg, fehler: null }
  const aktuell = letzterErfolg === null || new Date(letzterFehlerAm) > new Date(letzterErfolg)
  return { erfolgAm: letzterErfolg, fehler: aktuell ? { text: letzterFehler, am: letzterFehlerAm } : null }
}
