import { erstelleServerClient } from "@/lib/supabase/server"

export type ZahlenKennzahlen = {
  bisErstangebotTage: number | null
  erfolgsquoteProzent: number
  nacharbeitProTagMinuten: number
}

export async function holeZahlenKennzahlen(): Promise<ZahlenKennzahlen> {
  const supabase = await erstelleServerClient()

  const { data: anfragenData, error: anfragenError } = await supabase.from("anfragen").select("status")
  if (anfragenError) throw anfragenError
  const gesamt = anfragenData.length
  const vermittelt = anfragenData.filter((a) => a.status === "vermittelt").length
  const erfolgsquoteProzent = gesamt > 0 ? Math.round((vermittelt / gesamt) * 100) : 0

  // Embed über die Fremdschlüssel-Beziehung nachrichten.anfrage_id -> anfragen.id
  // (nachrichten_anfrage_id_fkey). Da anfrage_id nullable ist und die Beziehung
  // von nachrichten aus gesehen many-to-one ist, liefert der generierte Typ ein
  // einzelnes nullable Objekt (n.anfragen: { created_at: string } | null), kein
  // Array -- passend zum n.anfragen?.created_at-Zugriff unten.
  const { data: angeboteData, error: angeboteError } = await supabase
    .from("nachrichten")
    .select("created_at, anfragen(created_at)")
    .eq("typ", "angebot")
  if (angeboteError) throw angeboteError
  const tageBisAngebot = angeboteData
    .map((n) => {
      if (!n.anfragen) return null
      const differenz = new Date(n.created_at).getTime() - new Date(n.anfragen.created_at).getTime()
      return differenz / 86_400_000
    })
    .filter((wert): wert is number => wert !== null && wert >= 0)
  const bisErstangebotTage =
    tageBisAngebot.length > 0
      ? Math.round((tageBisAngebot.reduce((s, v) => s + v, 0) / tageBisAngebot.length) * 10) / 10
      : null

  return {
    bisErstangebotTage,
    erfolgsquoteProzent,
    // Würde eine Zeiterfassung der manuellen Nacharbeit voraussetzen, die nirgends
    // spezifiziert ist (Spec-Annahme A3) — aus dem Prototyp übernommener Beispielwert.
    nacharbeitProTagMinuten: 11,
  }
}

export async function holeErfolgsquoteVerlauf(): Promise<{ monat: string; prozent: number }[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").select("status, created_at")
  if (error) throw error

  const nachMonat = new Map<string, { gesamt: number; vermittelt: number }>()
  for (const a of data) {
    const monat = new Date(a.created_at).toISOString().slice(0, 7)
    const eintrag = nachMonat.get(monat) ?? { gesamt: 0, vermittelt: 0 }
    eintrag.gesamt += 1
    if (a.status === "vermittelt") eintrag.vermittelt += 1
    nachMonat.set(monat, eintrag)
  }

  return [...nachMonat.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monat, { gesamt, vermittelt }]) => ({
      monat,
      prozent: gesamt > 0 ? Math.round((vermittelt / gesamt) * 100) : 0,
    }))
}

export async function holeFlaechenVerteilung(): Promise<{ bereich: string; anzahl: number }[]> {
  const supabase = await erstelleServerClient()
  const { data, error } = await supabase.from("anfragen").select("flaeche_min, flaeche_max").eq("status", "offen")
  if (error) throw error

  const BEREICHE: [string, number, number][] = [
    ["bis 300 m²", 0, 300],
    ["300–800 m²", 300, 800],
    ["800–1'500 m²", 800, 1500],
    ["1'500–2'500 m²", 1500, 2500],
    ["über 2'500 m²", 2500, Infinity],
  ]

  return BEREICHE.map(([bereich, min, max]) => ({
    bereich,
    anzahl: data.filter((a) => {
      const referenz = a.flaeche_max ?? a.flaeche_min
      return referenz !== null && referenz > min && referenz <= max
    }).length,
  }))
}
