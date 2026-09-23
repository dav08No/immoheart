import type { Database } from "./database"

export type Nutzung = "buero" | "gewerbe" | "produktion" | "lager" | "verkauf" | "bauland"
export type KriteriumStatus = "ok" | "teilweise" | "nein"

export type Profil = Database["public"]["Tables"]["profiles"]["Row"]

export type Anfrage = {
  id: string
  flaecheMin: number | null
  flaecheMax: number | null
  ort: string | null
  budgetProM2: number | null
  bezug: string | null
  nutzung: Nutzung
  anforderungen: Record<string, boolean | number | string>
  letzterKontakt: Date
}

export type Objekt = {
  id: string
  titel: string
  ort: string
  flaeche: number
  preisProM2: number | null
  nutzung: Nutzung
  eigenschaften: Record<string, boolean | number | string>
  verfuegbarAb: Date
}

export type Kriterium = {
  kriterium: string
  gesucht: string
  angeboten: string
  status: KriteriumStatus
}

export type Match = {
  anfrageId: string
  objektId: string
  score: number
  kriterien: Kriterium[]
  hinweis: string
}
