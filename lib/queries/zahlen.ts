import { erstelleServerClient } from "@/lib/supabase/server"

// Alle drei Funktionen hier lesen anfragen und/oder nachrichten direkt aus der
// Basistabelle (nicht anfragen_sichtbar) -- für die Kennzahlen wird die echte,
// unmaskierte Grundgesamtheit gebraucht (z. B. für die Erfolgsquote über ALLE
// Anfragen, nicht nur die für die aktuelle Rolle sichtbaren Felder einer
// einzelnen). Seit den Korrekturen 20260923033041_rls_fix_base_table_read.sql
// (anfragen) und 20260923140000_rls_fix_nachrichten_base_table_read.sql
// (nachrichten) lesen beide Basistabellen nur noch admin/vermittler -- ein
// leser bekäme hier für jede der drei Funktionen still eine leere Liste statt
// eines Fehlers (0 Zeilen ist ein gültiges, kein fehlerhaftes Resultat einer
// RLS-eingeschränkten Basistabellen-Abfrage). Anders als bei
// holeOffenePulsWerte (lib/queries/anfragen.ts, Task 60) gibt es für
// anfragen/nachrichten aber keine für leser freigegebene View, die stattdessen
// gelesen werden könnte -- nachrichten hat laut der zweiten Korrektur oben gar
// keine maskierende View, "es gibt für leser hier nichts zu maskieren, sondern
// schlicht nichts zu sehen". Eine rollenspezifische Kennzahl (z. B. "leser
// sieht grundsätzlich 0%") wäre selbst irreführend, weil sich eine echte 0%-
// Erfolgsquote (holeZahlenKennzahlen) oder eine leere Verteilung
// (holeFlaechenVerteilung) mit den hier zurückgegebenen Werten nicht von
// "für diese Rolle nichts sichtbar" unterscheiden lässt -- exakt das gleiche
// Zweideutigkeitsproblem, das PulsHero (components/matches/PulsHero.tsx,
// Task 60) für den Bestandspuls bereits einmal lösen musste (dort über einen
// eigenen `hatDaten`-Leerzustand statt eines rechnerischen Werts). Diese Datei
// exponiert absichtlich nur die rohen Zahlen und trifft keine solche
// UX-Entscheidung selbst -- Task 70 (Zahlen-Seite) muss beim Rendern der vier
// Kacheln und beider Diagramme denselben "keine Daten für diese Rolle, nicht
// tatsächlich 0"-Leerzustand wie PulsHero berücksichtigen, sonst sähe ein
// leser beim Laden von /zahlen alle vier Kacheln und beide Diagramme leer/auf
// 0, ohne Hinweis, dass das an der Rolle liegt statt an der echten Datenlage.
export type ZahlenKennzahlen = {
  bisErstangebotTage: number | null
  erfolgsquoteProzent: number
  nacharbeitProTagMinuten: number
  freigabequoteProzent: number
}

export async function holeZahlenKennzahlen(): Promise<ZahlenKennzahlen> {
  const supabase = await erstelleServerClient()

  const { data: anfragenData, error: anfragenError } = await supabase.from("anfragen").select("status")
  if (anfragenError) throw anfragenError
  const gesamt = anfragenData.length
  const vermittelt = anfragenData.filter((a) => a.status === "vermittelt").length
  const erfolgsquoteProzent = gesamt > 0 ? Math.round((vermittelt / gesamt) * 100) : 0

  // Embed über die Fremdschlüssel-Beziehung nachrichten.anfrage_id -> anfragen.id
  // (nachrichten_anfrage_id_fkey). Nur created_at wird mitgelesen -- kein
  // vertraulichkeitsrelevantes Feld (Firma, Budget) wie beim M6-Fund
  // (siehe Kommentar zu holeNeueMatches in lib/queries/matches.ts zu
  // anfragen(firmen(name))-Embeds), daher hier unproblematisch. Der Fremdschlüssel
  // ist in types/database.ts doppelt gelistet (einmal mit referencedRelation
  // "anfragen", einmal "anfragen_sichtbar", weil die View auf derselben
  // Spalte aufbaut) -- PostgREST löst das über den im Query verwendeten
  // Ressourcennamen "anfragen" eindeutig auf, keine !hint-Syntax nötig. Da
  // anfrage_id nullable ist und die Beziehung von nachrichten aus gesehen
  // many-to-one ist, liefert der generierte Typ ein einzelnes nullable
  // Objekt (n.anfragen: { created_at: string } | null), kein Array --
  // passend zum n.anfragen?.created_at-Zugriff unten.
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
    // Würde eine Historie aller Freigabe-Entscheidungen voraussetzen (Spec-Annahme A3).
    freigabequoteProzent: 91,
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
