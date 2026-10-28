// Gemeinsamer Seiten-Helfer für Zahlen und Rapport.
// PostgREST liefert höchstens 1000 Zeilen je Anfrage -- darüber hinaus seitenweise.
export const SEITE = 1000

export async function alleSeiten<T>(
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
