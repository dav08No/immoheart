import type { Anfrage, Kriterium, Match, Objekt } from "@/types"
import { formatDatum, formatFlaeche, formatPreis } from "./format"

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
// Für gross-/kleinschreibungs- und whitespace-unabhängige Lookups: dieselben
// Regionen, aber mit normalisierten (getrimmt + kleingeschrieben) Schlüsseln.
const REGIONEN_NORMALISIERT: Record<string, string> = Object.fromEntries(
  Object.entries(REGIONEN).map(([ort, region]) => [ort.trim().toLowerCase(), region])
)

export function punkteLage(anfrage: Anfrage, objekt: Objekt): number {
  // Leerstring zählt wie null als "kein Ort genannt" -- ein leeres Pflichtfeld
  // in einem künftigen Formular darf nicht wie eine echte Ortsangabe scoren.
  const ortAnfrage = anfrage.ort?.trim().toLowerCase() ?? ""
  if (ortAnfrage === "") return 50
  const ortObjekt = objekt.ort.trim().toLowerCase()
  if (ortAnfrage === ortObjekt) return 100
  const regionAnfrage = REGIONEN_NORMALISIERT[ortAnfrage] ?? ortAnfrage
  const regionObjekt = REGIONEN_NORMALISIERT[ortObjekt] ?? ortObjekt
  if (regionAnfrage === regionObjekt) return 60
  return 20
}

export function punkteBezug(anfrage: Anfrage, objekt: Objekt): number {
  const bezugText = anfrage.bezug?.trim().toLowerCase() ?? ""
  if (bezugText === "") return 50
  if (bezugText === "sofort") {
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
      ? `${formatFlaeche(anfrage.flaecheMin)}–${formatFlaeche(anfrage.flaecheMax)}`
      : anfrage.flaecheMin !== null
        ? `ab ${formatFlaeche(anfrage.flaecheMin)}`
        : anfrage.flaecheMax !== null
          ? `bis ${formatFlaeche(anfrage.flaecheMax)}`
          : "?"
  return { kriterium: "Fläche", gesucht, angeboten: formatFlaeche(objekt.flaeche), status: statusFuer(punkte) }
}

function kriteriumPreis(anfrage: Anfrage, objekt: Objekt, punkte: number): Kriterium {
  return {
    kriterium: "Preis",
    gesucht: anfrage.budgetProM2 !== null ? `bis ${formatPreis(anfrage.budgetProM2)}` : "?",
    angeboten: objekt.preisProM2 !== null ? formatPreis(objekt.preisProM2) : "auf Anfrage",
    status: statusFuer(punkte),
  }
}

function kriteriumLage(anfrage: Anfrage, objekt: Objekt, punkte: number): Kriterium {
  return {
    kriterium: "Lage",
    gesucht: anfrage.ort?.trim() || "?",
    angeboten: objekt.ort,
    status: statusFuer(punkte),
  }
}

function kriteriumBezug(anfrage: Anfrage, objekt: Objekt, punkte: number): Kriterium {
  return {
    kriterium: "Bezug",
    gesucht: anfrage.bezug?.trim() || "?",
    // formatDatum wirft nie (im Gegensatz zu toISOString()), sondern liefert
    // bei einem ungültigen Datum "NaN.NaN.NaN" -- deshalb hier explizit auf
    // "?" abgefangen, statt dieses Detail nach aussen durchsickern zu lassen.
    angeboten: Number.isNaN(objekt.verfuegbarAb.getTime()) ? "?" : formatDatum(objekt.verfuegbarAb),
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
  // Nutzung ist ein hartes Ausschlusskriterium, kein gewichtetes: eine
  // Produktionshalle-Anfrage gegen ein Bauland-Objekt darf niemals einen
  // Score liefern, unabhängig davon wie gut Fläche/Preis/Lage zufällig
  // passen. Das README-Gewichtungstable (30/25/20/15/10) listet Nutzung
  // nicht separat auf, aber der verbindliche Prototyp (puls-cockpit-v5.html,
  // Kriterien-Zeile "Zone") führt sie explizit als eigene Prüfung -- ohne
  // dieses Gate schlug die Milestone-Review auf den echten Seed-Daten 13 von
  // 20 Matches als Nutzungs-Fehlpassungen fehl (z. B. eine Lagerhalle-Anfrage,
  // die auf ein reines Büro-Objekt "gematcht" wurde).
  if (anfrage.nutzung !== objekt.nutzung) return null

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

  // score < 60 schliesst NICHT automatisch NaN aus (NaN < 60 ist false in
  // JS) -- ohne den expliziten Number.isFinite-Check würde ein NaN-Score
  // (z. B. aus einem von der KI-Extraktion falsch geparsten Zahlenfeld in
  // M5) das einzige Gate der Funktion umgehen und als "Match" durchrutschen.
  if (!Number.isFinite(score) || score < 60) return null

  // Jede Zeile trägt ihre rohen Punkte und ihren Hinweistext direkt mit
  // (statt eines separaten Nachschlage-Records nach `kriterium`-Namen):
  // Erstens bestimmt das den schwächsten Punkt anhand des tatsächlichen
  // Werts statt nur anhand des groben Status ("ok"/"teilweise"/"nein") — bei
  // zwei Kriterien im selben Status würde die reine Status-Auswahl sonst
  // immer das erste in der Tabelle nennen, auch wenn ein anderes objektiv
  // schwächer ist. Zweitens vermeidet es, dass `kriterium: string` (kein
  // literal Union) den Record-Zugriff unter `noUncheckedIndexedAccess` zu
  // `string | undefined` macht.
  //
  // Jeder Hinweistext unterscheidet drei Fälle statt nur "gut" vs.
  // "schlecht" -- bei der Milestone-Review fielen zwei Arten von falschen
  // Hinweisen auf: (1) "kein Wert genannt" (score 50) wurde mit derselben
  // Formulierung wie ein echter Fehlschlag ausgegeben ("Preis liegt spürbar
  // über dem genannten Budget", obwohl gar kein Budget genannt war), und
  // (2) ein echter Teilerfolg (score 60, z. B. gleiche Region/anderer Ort
  // bei Lage) wurde mit einer Formulierung ausgegeben, die das Gegenteil
  // behauptet ("Lage entspricht nicht der gewünschten Region", obwohl die
  // Region sehr wohl übereinstimmt).
  const flaecheUnbekannt = anfrage.flaecheMin === null && anfrage.flaecheMax === null
  const lageUnbekannt = (anfrage.ort?.trim() ?? "") === ""
  const bezugUnbekannt = (anfrage.bezug?.trim() ?? "") === ""
  const anforderungenUnbekannt = Object.keys(anfrage.anforderungen).length === 0

  const bewertungen = [
    {
      kriterium: kriteriumFlaeche(anfrage, objekt, pFlaeche), punkte: pFlaeche,
      hinweisText: flaecheUnbekannt
        ? "Keine Flächenangabe vorhanden."
        : pFlaeche < 50
          ? "Fläche weicht deutlich von der gesuchten Spanne ab."
          : "Fläche liegt nur teilweise in der gesuchten Spanne.",
    },
    {
      kriterium: kriteriumPreis(anfrage, objekt, pPreis), punkte: pPreis,
      hinweisText:
        anfrage.budgetProM2 === null
          ? "Kein Budget genannt."
          : objekt.preisProM2 === null
            ? "Preis des Objekts ist auf Anfrage, kein Vergleich möglich."
            : pPreis < 50
              ? "Preis liegt deutlich über dem genannten Budget."
              : "Preis liegt leicht über dem genannten Budget.",
    },
    {
      kriterium: kriteriumLage(anfrage, objekt, pLage), punkte: pLage,
      hinweisText: lageUnbekannt
        ? "Kein Wunschort genannt."
        : pLage < 50
          ? "Lage entspricht nicht der gewünschten Region."
          : "Lage entspricht der Region, aber nicht dem genauen Ort.",
    },
    {
      kriterium: kriteriumBezug(anfrage, objekt, pBezug), punkte: pBezug,
      hinweisText: bezugUnbekannt
        ? "Kein Bezugstermin genannt."
        : pBezug < 50
          ? "Bezugstermin weicht deutlich vom Wunsch ab."
          : "Bezugstermin weicht teilweise vom Wunsch ab.",
    },
    {
      kriterium: kriteriumAnforderungen(anfrage, pAnforderungen), punkte: pAnforderungen,
      hinweisText: anforderungenUnbekannt
        ? "Keine Zusatzanforderungen genannt."
        : pAnforderungen < 50
          ? "Kaum Zusatzanforderungen erfüllt."
          : "Nicht alle Zusatzanforderungen sind erfüllt.",
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
