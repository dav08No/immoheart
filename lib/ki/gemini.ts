import { GoogleGenAI } from "@google/genai"

// gemini-2.5-flash wurde von Google deprecatet (404 "no longer available to
// new users") -- live gegen die echte API verifiziert, ebenso
// gemini-2.0-flash (beide 404). gemini-3.8-flash ist Googles eigene
// Empfehlung aus der Fehlermeldung und live bestätigt erreichbar (ein
// einfacher Testaufruf lieferte 200; ein zweiter, realistischerer Aufruf traf
// wiederholt auf ein vorübergehendes 503 "high demand" -- ein
// Kapazitätsproblem auf Google-Seite, kein Hinweis auf ein falsches Modell
// oder einen ungültigen Key). gemini-flash-latest ist ebenfalls live mit
// diesem Key erreichbar bestätigt und dient als Ersatzmodell, falls
// gemini-3.8-flash überlastet ist oder (künftig) selbst deprecatet wird.
// Im Gratis-Tarif hat jedes Modell ein eigenes, kleines Tageskontingent (live:
// 20 Anfragen/Tag für gemini-3.8-flash) -- weitere, live erreichbare Modelle
// verlängern die Kette, damit ein erschöpftes Kontingent nicht die ganze
// Verarbeitung stoppt.
const MODELLE = [
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
] as const

const VERSUCHE_PRO_MODELL = 2

// Wartezeit vor dem zweiten Versuch auf demselben Modell. Nach dem letzten
// Versuch eines Modells wird nicht mehr gewartet, sondern direkt zum nächsten
// Modell gewechselt.
const WARTEZEITEN_MS = [500]

const VORUEBERGEHENDE_STATUS = [429, 500, 502, 503, 504]

// Eine Mail-Verarbeitung macht zwei generiereText-Aufrufe (ordneEin + Entwurf) und muss
// in die 60 s einer Server Action passen (Final-Review I4): pro Anfrage höchstens 20 s,
// pro generiereText insgesamt höchstens ~22 s (+ eine letzte Wartezeit) inkl. aller
// Wiederholungen und Modellwechsel.
const ANFRAGE_TIMEOUT_MS = 20_000
const GESAMT_BUDGET_MS = 22_000
// Weniger Restzeit lohnt keinen weiteren Versuch mehr.
const MIN_RESTZEIT_MS = 2_000

function holeStatus(fehler: unknown): number | undefined {
  if (typeof fehler !== "object" || fehler === null) return undefined
  const objekt = fehler as Record<string, unknown>
  // @google/genai's ApiError setzt ausschliesslich `status` (siehe
  // node_modules/@google/genai/dist/genai.d.ts), kein `code` -- kein Fallback
  // auf ein Feld, das dieser Client nie liefert.
  return typeof objekt.status === "number" ? objekt.status : undefined
}

// Vorübergehende Fehler (Überlastung, Gateway-Probleme) rechtfertigen einen
// erneuten Versuch auf demselben Modell. Alles andere (falscher Key, falsche
// Anfrage) würde beim nächsten Versuch identisch scheitern.
export function istVoruebergehend(fehler: unknown): boolean {
  const status = holeStatus(fehler)
  return status !== undefined && VORUEBERGEHENDE_STATUS.includes(status)
}

// 404 bedeutet: das Modell selbst ist (z.B. wegen Deprecation) nicht
// verfügbar -- ein erneuter Versuch auf demselben Modell wäre sinnlos, aber
// das nächste Modell in der Liste kann trotzdem funktionieren.
export function istModellNichtVerfuegbar(fehler: unknown): boolean {
  return holeStatus(fehler) === 404
}

// 429 heisst hier fast immer "Kontingent dieses Modells erschöpft" -- ein
// erneuter Versuch auf demselben Modell scheitert identisch, das nächste
// Modell hat ein eigenes Kontingent.
export function istKontingentErschoepft(fehler: unknown): boolean {
  return holeStatus(fehler) === 429
}

// Ein Client pro generiereText-Aufruf statt pro Versuch: der Client hält
// keinen Zustand, der zwischen Versuchen erneuert werden müsste, und ein
// einziger reicht für alle Modelle/Wiederholungen dieses Aufrufs.
type Erzeuge = (modell: string, prompt: string, timeoutMs: number) => Promise<string | undefined>

function baueErzeugeStandard(client: GoogleGenAI): Erzeuge {
  return async (modell, prompt, timeoutMs) => {
    const signal = AbortSignal.timeout(timeoutMs)
    try {
      const antwort = await client.models.generateContent({ model: modell, contents: prompt, config: { abortSignal: signal } })
      return antwort.text
    } catch (fehler) {
      // Eigene, verständliche Meldung statt "This operation was aborted"; ohne Status,
      // also kein weiterer Versuch -- das Zeitbudget ist danach ohnehin aufgebraucht.
      if (signal.aborted) throw new Error("Zeitüberschreitung bei der KI-Anfrage.")
      throw fehler
    }
  }
}

function warteStandard(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type GeneriereTextOptionen = {
  erzeuge?: Erzeuge
  warte?: (ms: number) => Promise<void>
  jetzt?: () => number
}

export async function generiereText(
  prompt: string,
  { erzeuge, warte = warteStandard, jetzt = Date.now }: GeneriereTextOptionen = {}
): Promise<string> {
  const aufruf = erzeuge ?? baueErzeugeStandard(new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }))
  const ende = jetzt() + GESAMT_BUDGET_MS
  let letzterFehler: unknown

  for (const modell of MODELLE) {
    for (let versuch = 0; versuch < VERSUCHE_PRO_MODELL; versuch++) {
      const rest = ende - jetzt()
      // letzterFehler ist hier immer gesetzt: der erste Versuch hat das volle Budget.
      if (rest < MIN_RESTZEIT_MS) throw letzterFehler
      try {
        const text = await aufruf(modell, prompt, Math.min(ANFRAGE_TIMEOUT_MS, rest))
        // Eine leere Antwort hat keinen HTTP-Status, gilt also weder als
        // vorübergehend noch als "Modell nicht verfügbar" -- sie wird unten
        // sofort geworfen, bewusst ohne Versuch auf dem Ersatzmodell: ein
        // leerer Text deutet auf ein Prompt-/Antwortproblem hin, nicht auf
        // eine Kapazitätsgrenze des Modells.
        if (!text) throw new Error("Unerwartete Antwort der KI")
        return text
      } catch (fehler) {
        letzterFehler = fehler
        if (istModellNichtVerfuegbar(fehler) || istKontingentErschoepft(fehler)) break
        if (!istVoruebergehend(fehler)) throw fehler
        const wartezeit = WARTEZEITEN_MS[versuch]
        if (wartezeit !== undefined) await warte(wartezeit)
      }
    }
  }

  throw letzterFehler
}
