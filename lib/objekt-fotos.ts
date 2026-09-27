// Reine Regeln für Objektfotos (ohne DB/Storage), damit sie ohne Supabase testbar sind.
// Dieselben Grenzen setzt auch der Bucket `objekt-fotos` durch -- hier geprüft, damit die
// Nutzerin eine verständliche Meldung bekommt, bevor überhaupt hochgeladen wird.

export const FOTO_BUCKET = "objekt-fotos"
export const MAX_FOTO_BYTES = 5 * 1024 * 1024
export const MAX_BESCHREIBUNG = 4000

const ENDUNGEN = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const

export type FotoMime = keyof typeof ENDUNGEN
export const FOTO_MIME_TYPEN = Object.keys(ENDUNGEN) as FotoMime[]

export function istFotoMime(mime: string): mime is FotoMime {
  return Object.hasOwn(ENDUNGEN, mime)
}

// Endung nur aus dem geprüften MIME-Typ, nie aus dem Dateinamen der Nutzerin.
export function endungFuerMime(mime: string): string | null {
  return istFotoMime(mime) ? ENDUNGEN[mime] : null
}

export const FORMAT_FEHLER = "Dieses Format kann nicht als Objektfoto verwendet werden."

export function pruefeFoto(mime: string, groesse: number): string | null {
  if (!istFotoMime(mime)) return FORMAT_FEHLER
  if (!Number.isFinite(groesse) || groesse <= 0) return "Die Datei ist leer."
  if (groesse > MAX_FOTO_BYTES) return "Das Foto ist grösser als 5 MB."
  return null
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
const PFAD_MUSTER = new RegExp(`^(${UUID})/(${UUID})\\.(jpg|png|webp)$`)

// Nur genau die Form, die erstelleUploadZiel vergibt: kein Unterordner, kein "..",
// kein fremdes Objekt -- so kann fotoRegistrieren keine beliebige Datei übernehmen.
export function zerlegeFotoPfad(pfad: string, objektId: string): { dateiname: string } | null {
  const treffer = PFAD_MUSTER.exec(pfad)
  if (!treffer || treffer[1] !== objektId.toLowerCase()) return null
  return { dateiname: `${treffer[2]}.${treffer[3]}` }
}

export function neuerFotoPfad(objektId: string, uuid: string, mime: FotoMime): string {
  return `${objektId.toLowerCase()}/${uuid.toLowerCase()}.${ENDUNGEN[mime]}`
}

// Für die Pfeil-Knöpfe: ausserhalb der Liste bleibt alles unverändert.
export function verschiebe<T>(liste: readonly T[], von: number, nach: number): T[] {
  const kopie = [...liste]
  if (von === nach || von < 0 || nach < 0 || von >= kopie.length || nach >= kopie.length) return kopie
  kopie.splice(nach, 0, ...kopie.splice(von, 1))
  return kopie
}

// Die neue Reihenfolge muss genau die vorhandenen Fotos enthalten -- sonst hat ein
// anderer Tab inzwischen Fotos hinzugefügt oder gelöscht.
export function istVollstaendigeReihenfolge(vorhanden: readonly string[], neu: readonly string[]): boolean {
  if (vorhanden.length !== neu.length || new Set(neu).size !== neu.length) return false
  const menge = new Set(vorhanden)
  return neu.every((id) => menge.has(id))
}

export function naechsteReihenfolge(vorhanden: readonly { reihenfolge: number }[]): number {
  return vorhanden.reduce((max, f) => Math.max(max, f.reihenfolge + 1), 0)
}

// Zeilen kommen nach reihenfolge sortiert; das erste Foto je Objekt ist das Titelbild.
export function erstesJeObjekt<T extends { objekt_id: string }>(zeilen: readonly T[]): Map<string, T> {
  const ergebnis = new Map<string, T>()
  for (const z of zeilen) if (!ergebnis.has(z.objekt_id)) ergebnis.set(z.objekt_id, z)
  return ergebnis
}

export function zaehleJeObjekt(zeilen: readonly { objekt_id: string | null }[]): Record<string, number> {
  const ergebnis: Record<string, number> = {}
  for (const { objekt_id } of zeilen) if (objekt_id) ergebnis[objekt_id] = (ergebnis[objekt_id] ?? 0) + 1
  return ergebnis
}
