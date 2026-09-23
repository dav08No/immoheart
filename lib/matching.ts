import type { Anfrage, Kriterium, Match, Objekt } from "@/types"

export function punkteFlaeche(anfrage: Anfrage, objekt: Objekt): number {
  const { flaecheMin, flaecheMax } = anfrage
  if (flaecheMin === null && flaecheMax === null) return 50

  const min = flaecheMin ?? 0
  const max = flaecheMax ?? Infinity
  if (objekt.flaeche >= min && objekt.flaeche <= max) return 100

  const referenz = objekt.flaeche < min ? min : max
  const abweichung = Math.abs(objekt.flaeche - referenz) / referenz
  return Math.max(0, Math.round(100 - abweichung * 100))
}

export function punktePreis(anfrage: Anfrage, objekt: Objekt): number {
  if (anfrage.budgetProM2 === null || objekt.preisProM2 === null) return 50
  if (objekt.preisProM2 <= anfrage.budgetProM2) return 100

  const ueberschreitung = (objekt.preisProM2 / anfrage.budgetProM2 - 1) * 100
  // Bis 12% über Budget gilt laut README noch als voller Treffer.
  if (ueberschreitung <= 12) return 100

  const ueberTolerierten = ueberschreitung - 12
  return Math.max(0, Math.round(100 - ueberTolerierten * 2))
}

const REGIONEN: Record<string, string> = {
  Solothurn: "Solothurn", Bettlach: "Jura", Selzach: "Jura",
  Zuchwil: "Wasseramt", Derendingen: "Wasseramt", Biberist: "Wasseramt", Luterbach: "Wasseramt",
  Wasseramt: "Wasseramt",
}

export function punkteLage(anfrage: Anfrage, objekt: Objekt): number {
  if (anfrage.ort === null) return 50
  if (anfrage.ort === objekt.ort) return 100
  const regionAnfrage = REGIONEN[anfrage.ort] ?? anfrage.ort
  const regionObjekt = REGIONEN[objekt.ort] ?? objekt.ort
  if (regionAnfrage === regionObjekt) return 60
  return 20
}

export function punkteBezug(anfrage: Anfrage, objekt: Objekt): number {
  if (anfrage.bezug === null) return 50
  if (anfrage.bezug.trim().toLowerCase() === "sofort") {
    const tage = (objekt.verfuegbarAb.getTime() - Date.now()) / 86_400_000
    if (tage <= 0) return 100
    if (tage <= 30) return 60
    return 20
  }
  return 60
}

export function punkteAnforderungen(anfrage: Anfrage, objekt: Objekt): number {
  const eintraege = Object.entries(anfrage.anforderungen)
  if (eintraege.length === 0) return 100

  const erfuellt = eintraege.filter(([schluessel, wert]) => {
    const angebotswert = objekt.eigenschaften[schluessel]
    if (typeof wert === "number") return typeof angebotswert === "number" && angebotswert >= wert
    return angebotswert === wert
  }).length

  return Math.round((erfuellt / eintraege.length) * 100)
}

// Gewichtung exakt aus dem README: Fläche 30%, Preis 25%, Lage 20%, Bezug 15%, Anforderungen 10%.
const GEWICHTE = { flaeche: 0.3, preis: 0.25, lage: 0.2, bezug: 0.15, anforderungen: 0.1 } as const

function statusFuer(punkte: number): Kriterium["status"] {
  return punkte >= 90 ? "ok" : punkte >= 50 ? "teilweise" : "nein"
}

function kriteriumFlaeche(anfrage: Anfrage, objekt: Objekt, punkte: number): Kriterium {
  const gesucht =
    anfrage.flaecheMin !== null && anfrage.flaecheMax !== null
      ? `${anfrage.flaecheMin}–${anfrage.flaecheMax} m²`
      : anfrage.flaecheMin !== null
        ? `ab ${anfrage.flaecheMin} m²`
        : anfrage.flaecheMax !== null
          ? `bis ${anfrage.flaecheMax} m²`
          : "?"
  return {
    kriterium: "Fläche", gesucht, angeboten: `${objekt.flaeche} m²`,
    status: statusFuer(punkte),
  }
}

function kriteriumPreis(anfrage: Anfrage, objekt: Objekt, punkte: number): Kriterium {
  return {
    kriterium: "Preis",
    gesucht: anfrage.budgetProM2 !== null ? `bis CHF ${anfrage.budgetProM2}/m²` : "?",
    angeboten: objekt.preisProM2 !== null ? `CHF ${objekt.preisProM2}/m²` : "auf Anfrage",
    status: statusFuer(punkte),
  }
}

function kriteriumLage(anfrage: Anfrage, objekt: Objekt, punkte: number): Kriterium {
  return {
    kriterium: "Lage", gesucht: anfrage.ort ?? "?", angeboten: objekt.ort,
    status: statusFuer(punkte),
  }
}

function kriteriumBezug(anfrage: Anfrage, objekt: Objekt, punkte: number): Kriterium {
  return {
    kriterium: "Bezug",
    gesucht: anfrage.bezug ?? "?",
    angeboten: objekt.verfuegbarAb.toISOString().slice(0, 10),
    status: statusFuer(punkte),
  }
}

function kriteriumAnforderungen(anfrage: Anfrage, punkte: number): Kriterium {
  const anzahl = Object.keys(anfrage.anforderungen).length
  return {
    kriterium: "Anforderungen",
    gesucht: anzahl > 0 ? `${anzahl} Anforderung(en)` : "keine",
    angeboten: `${punkte}% erfüllt`,
    status: statusFuer(punkte),
  }
}

export function berechneMatch(anfrage: Anfrage, objekt: Objekt): Match | null {
  const pFlaeche = punkteFlaeche(anfrage, objekt)
  const pPreis = punktePreis(anfrage, objekt)
  const pLage = punkteLage(anfrage, objekt)
  const pBezug = punkteBezug(anfrage, objekt)
  const pAnforderungen = punkteAnforderungen(anfrage, objekt)

  const score = Math.round(
    pFlaeche * GEWICHTE.flaeche +
      pPreis * GEWICHTE.preis +
      pLage * GEWICHTE.lage +
      pBezug * GEWICHTE.bezug +
      pAnforderungen * GEWICHTE.anforderungen
  )

  if (score < 60) return null

  // Jede Zeile trägt ihre rohen Punkte und ihren Hinweistext direkt mit
  // (statt eines separaten Nachschlage-Records nach `kriterium`-Namen):
  // Erstens bestimmt das den schwächsten Punkt anhand des tatsächlichen
  // Werts statt nur anhand des groben Status ("ok"/"teilweise"/"nein") — bei
  // zwei Kriterien im selben Status würde die reine Status-Auswahl sonst
  // immer das erste in der Tabelle nennen, auch wenn ein anderes objektiv
  // schwächer ist. Zweitens vermeidet es, dass `kriterium: string` (kein
  // literal Union) den Record-Zugriff unter `noUncheckedIndexedAccess` zu
  // `string | undefined` macht.
  const bewertungen = [
    {
      kriterium: kriteriumFlaeche(anfrage, objekt, pFlaeche), punkte: pFlaeche,
      hinweisText: "Fläche weicht von der gesuchten Spanne ab.",
    },
    {
      kriterium: kriteriumPreis(anfrage, objekt, pPreis), punkte: pPreis,
      hinweisText: "Preis liegt spürbar über dem genannten Budget.",
    },
    {
      kriterium: kriteriumLage(anfrage, objekt, pLage), punkte: pLage,
      hinweisText: "Lage entspricht nicht der gewünschten Region.",
    },
    {
      kriterium: kriteriumBezug(anfrage, objekt, pBezug), punkte: pBezug,
      hinweisText: "Bezugstermin weicht deutlich vom Wunsch ab.",
    },
    {
      kriterium: kriteriumAnforderungen(anfrage, pAnforderungen), punkte: pAnforderungen,
      hinweisText: "Nicht alle Zusatzanforderungen sind erfüllt.",
    },
  ]

  const kriterien = bewertungen.map((b) => b.kriterium)

  const schwaechstes = bewertungen.reduce((a, b) => (b.punkte < a.punkte ? b : a))

  return {
    anfrageId: anfrage.id,
    objektId: objekt.id,
    score,
    kriterien,
    hinweis: schwaechstes.kriterium.status === "ok" ? "Alle Kriterien passen gut." : schwaechstes.hinweisText,
  }
}
