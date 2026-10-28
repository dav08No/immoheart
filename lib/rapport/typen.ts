// Vertrag zwischen Next.js und der Python-Funktion api/rapport_excel.py (Ruling R2).
// Beispiel: api/tests/fixtures/modell.json (erzeugt von lib/rapport/modell.test.ts).
// Die Schlüssel zeitraum.label und diagramme.anfragenProMonat stammen aus dem Spike (R1).

export type SpaltenTyp = "text" | "zahl" | "datum" | "chf"

export type Spalte = { schluessel: string; titel: string; typ: SpaltenTyp }

// Datumswerte als yyyy-mm-dd (Zürcher Kalendertag), Beträge in CHF als Zahl.
export type Zelle = string | number | null

export type Tabelle = { titel: string; spalten: Spalte[]; zeilen: Record<string, Zelle>[] }

export type KachelSchluessel = "neueAnfragen" | "neueObjekte" | "treffer" | "angebote" | "vermittlungen" | "vermittlungsquote"

export type Kachel = {
  schluessel: KachelSchluessel
  titel: string
  // "prozent": wert ist ein Anteil 0..1, die Darstellung macht Excel.
  format: "zahl" | "prozent"
  wert: number | null
  text: string // kurzer Zusatz unter der Zahl, ohne Namen
}

export type MonatAnfragen = { label: string; mail: number; website: number; manuell: number }
export type MonatAngebote = { label: string; angebote: number; vermittlungen: number }

export type RapportDiagramme = {
  anfragenProMonat: MonatAnfragen[]
  angeboteUndVermittlungenProMonat: MonatAngebote[]
  trefferNachErgebnis: { ergebnis: string; anzahl: number }[]
  nutzungen: { label: string; anzahl: number }[]
}

export type Medianwerte = { tageBisErstangebot: number | null; tageBisAbschluss: number | null }

export type RapportTexte = { rueckblick: string; trends: string; auffaelligkeiten: string; ausblick: string }

// Ergebnis der KI-Zusammenfassung (Task 7); null/fehlend = nicht angefragt.
export type RapportZusammenfassung = { text: RapportTexte } | { fehler: string }

export type RapportModell = {
  zeitraum: { label: string; von: string; bis: string }
  kennzahlen: Kachel[]
  medianwerte: Medianwerte
  diagramme: RapportDiagramme
  tabellen: {
    vermittlungen: Tabelle
    angebote: Tabelle
    treffer: Tabelle
    anfragen: Tabelle
    objekte: Tabelle
  }
  hinweise: string[]
  zusammenfassung?: RapportZusammenfassung | null
}

// Nur für die KI (Task 7): Zahlen und feste Beschriftungen, nie Namen oder Texte.
export type KennzahlenFuerKi = {
  zeitraum: string
  kennzahlen: Record<KachelSchluessel, number | null>
  medianwerte: Medianwerte
  anfragenProMonat: MonatAnfragen[]
  angeboteUndVermittlungenProMonat: MonatAngebote[]
  trefferNachErgebnis: { ergebnis: string; anzahl: number }[]
  nutzungen: { label: string; anzahl: number }[]
}
