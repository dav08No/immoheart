// Reine Logik der öffentlichen Objektsuche (Filter, Sortierung, URL-Parameter):
// kein Supabase, kein I/O -- so bleibt sie unit-testbar und die Seite selbst schmal.
import type { Nutzung } from "@/types"
import { Constants } from "@/types/database"

export type Sortierung = "neu" | "flaeche" | "preis"

export type ObjektFilter = {
  nutzung: Nutzung[]
  orte: string[]
  flaecheMin: number | null
  flaecheMax: number | null
  preisMax: number | null
  verfuegbarBis: string | null
  eigenschaften: string[]
  sortierung: Sortierung
}

export type OeffentlichesObjekt = {
  id: string
  titel: string
  ort: string
  flaeche: number
  preis_pro_m2: number | null
  nutzung: Nutzung
  eigenschaften: Record<string, unknown>
  verfuegbar_ab: string
  status: "verfuegbar" | "reserviert"
  created_at: string
  beschreibung: string | null
  titelbild: string | null
}

// Obergrenzen der URL-Parameter; die Filter-Oberfläche nutzt dieselben Werte.
export const MAX_FLAECHE = 100000
export const MAX_PREIS_PRO_M2 = 10000

const NUTZUNG_WERTE = new Set<string>(Constants.public.Enums.nutzung_enum)

type RohParams = Record<string, string | string[] | undefined>

function alsListe(params: RohParams, key: string): string[] {
  const wert = params[key]
  if (wert === undefined) return []
  // Doppelte Werte (?ort=A&ort=A) ergäben doppelte Chips und Kriterien.
  return [...new Set(Array.isArray(wert) ? wert : [wert])]
}

function ersterWert(params: RohParams, key: string): string | undefined {
  const wert = params[key]
  return Array.isArray(wert) ? wert[0] : wert
}

// Ganzzahl-Regex statt Number()/parseInt() alleine, weil "1e9", "0x10" oder " 5"
// sonst als gültige Zahl durchgehen würden -- die Suche darf aus der URL nur
// echte, unverdächtige Ganzzahlen im erlaubten Bereich übernehmen.
function ganzzahlImBereich(wert: string | undefined, min: number, max: number): number | null {
  if (wert === undefined || !/^\d+$/.test(wert)) return null
  const n = Number(wert)
  return n >= min && n <= max ? n : null
}

function gueltigesDatum(wert: string | undefined): string | null {
  if (wert === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(wert)) return null
  const [jahr, monat, tag] = wert.split("-").map(Number) as [number, number, number]
  const datum = new Date(Date.UTC(jahr, monat - 1, tag))
  const gueltig = datum.getUTCFullYear() === jahr && datum.getUTCMonth() === monat - 1 && datum.getUTCDate() === tag
  return gueltig ? wert : null
}

export function leseFilter(params: RohParams, bekannteOrte: string[], bekannteEigenschaften: string[]): ObjektFilter {
  const nutzung = alsListe(params, "nutzung").filter((w): w is Nutzung => NUTZUNG_WERTE.has(w))
  const orte = alsListe(params, "ort").filter((o) => bekannteOrte.includes(o))
  const eigenschaften = alsListe(params, "eig").filter((e) => bekannteEigenschaften.includes(e))

  let flaecheMin = ganzzahlImBereich(ersterWert(params, "flaeche_min"), 0, MAX_FLAECHE)
  let flaecheMax = ganzzahlImBereich(ersterWert(params, "flaeche_max"), 0, MAX_FLAECHE)
  if (flaecheMin !== null && flaecheMax !== null && flaecheMin > flaecheMax) {
    ;[flaecheMin, flaecheMax] = [flaecheMax, flaecheMin]
  }

  const sortWert = ersterWert(params, "sort")
  const sortierung: Sortierung = sortWert === "flaeche" || sortWert === "preis" ? sortWert : "neu"

  return {
    nutzung,
    orte,
    flaecheMin,
    flaecheMax,
    preisMax: ganzzahlImBereich(ersterWert(params, "preis_max"), 0, MAX_PREIS_PRO_M2),
    verfuegbarBis: gueltigesDatum(ersterWert(params, "verfuegbar_bis")),
    eigenschaften,
    sortierung,
  }
}

function sortiere(objekte: OeffentlichesObjekt[], sortierung: Sortierung): OeffentlichesObjekt[] {
  const kopie = [...objekte]
  if (sortierung === "neu") return kopie.sort((a, b) => b.created_at.localeCompare(a.created_at))
  if (sortierung === "flaeche") return kopie.sort((a, b) => a.flaeche - b.flaeche)
  return kopie.sort((a, b) => {
    if (a.preis_pro_m2 === null) return b.preis_pro_m2 === null ? 0 : 1
    if (b.preis_pro_m2 === null) return -1
    return a.preis_pro_m2 - b.preis_pro_m2
  })
}

export function filtereObjekte(objekte: OeffentlichesObjekt[], f: ObjektFilter): OeffentlichesObjekt[] {
  const gefiltert = objekte.filter((o) => {
    if (f.nutzung.length > 0 && !f.nutzung.includes(o.nutzung)) return false
    if (f.orte.length > 0 && !f.orte.includes(o.ort)) return false
    if (f.flaecheMin !== null && o.flaeche < f.flaecheMin) return false
    if (f.flaecheMax !== null && o.flaeche > f.flaecheMax) return false
    // Preis auf Anfrage (kein preis_pro_m2) darf preisMax nicht ausschliessen.
    if (f.preisMax !== null && o.preis_pro_m2 !== null && o.preis_pro_m2 > f.preisMax) return false
    if (f.verfuegbarBis !== null && o.verfuegbar_ab > f.verfuegbarBis) return false
    if (f.eigenschaften.length > 0 && !f.eigenschaften.every((e) => Boolean(o.eigenschaften[e]))) return false
    return true
  })
  return sortiere(gefiltert, f.sortierung)
}

export function filterZuSuchparametern(f: ObjektFilter): URLSearchParams {
  const p = new URLSearchParams()
  for (const n of f.nutzung) p.append("nutzung", n)
  for (const o of f.orte) p.append("ort", o)
  if (f.flaecheMin !== null) p.set("flaeche_min", String(f.flaecheMin))
  if (f.flaecheMax !== null) p.set("flaeche_max", String(f.flaecheMax))
  if (f.preisMax !== null) p.set("preis_max", String(f.preisMax))
  if (f.verfuegbarBis !== null) p.set("verfuegbar_bis", f.verfuegbarBis)
  for (const e of f.eigenschaften) p.append("eig", e)
  p.set("sort", f.sortierung)
  return p
}

export function eigenschaftsSchluessel(objekte: OeffentlichesObjekt[]): string[] {
  const schluessel = new Set<string>()
  for (const o of objekte) {
    for (const [k, v] of Object.entries(o.eigenschaften)) {
      if (v) schluessel.add(k)
    }
  }
  return [...schluessel].sort()
}

export function aehnlicheObjekte(alle: OeffentlichesObjekt[], objekt: OeffentlichesObjekt, max: number): OeffentlichesObjekt[] {
  return alle
    .filter((o) => o.id !== objekt.id && (o.nutzung === objekt.nutzung || o.ort === objekt.ort))
    .sort((a, b) => Math.abs(a.flaeche - objekt.flaeche) - Math.abs(b.flaeche - objekt.flaeche))
    .slice(0, max)
}
