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
const MODELLE = ["gemini-3.8-flash", "gemini-flash-latest"] as const

const VERSUCHE_PRO_MODELL = 3

// Wartezeit vor dem jeweils nächsten Versuch auf demselben Modell (Index 0
// vor Versuch 2, Index 1 vor Versuch 3). Nach dem letzten Versuch eines
// Modells wird nicht mehr gewartet, sondern direkt zum nächsten Modell
// gewechselt.
const WARTEZEITEN_MS = [500, 1500]

const VORUEBERGEHENDE_STATUS = [429, 500, 502, 503, 504]

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

// Ein Client pro generiereText-Aufruf statt pro Versuch: der Client hält
// keinen Zustand, der zwischen Versuchen erneuert werden müsste, und ein
// einziger reicht für alle Modelle/Wiederholungen dieses Aufrufs.
function baueErzeugeStandard(client: GoogleGenAI): (modell: string, prompt: string) => Promise<string | undefined> {
  return async (modell, prompt) => {
    const antwort = await client.models.generateContent({ model: modell, contents: prompt })
    return antwort.text
  }
}

function warteStandard(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type GeneriereTextOptionen = {
  erzeuge?: (modell: string, prompt: string) => Promise<string | undefined>
  warte?: (ms: number) => Promise<void>
}

export async function generiereText(
  prompt: string,
  { erzeuge, warte = warteStandard }: GeneriereTextOptionen = {}
): Promise<string> {
  const aufruf = erzeuge ?? baueErzeugeStandard(new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }))
  let letzterFehler: unknown

  for (const modell of MODELLE) {
    for (let versuch = 0; versuch < VERSUCHE_PRO_MODELL; versuch++) {
      try {
        const text = await aufruf(modell, prompt)
        // Eine leere Antwort hat keinen HTTP-Status, gilt also weder als
        // vorübergehend noch als "Modell nicht verfügbar" -- sie wird unten
        // sofort geworfen, bewusst ohne Versuch auf dem Ersatzmodell: ein
        // leerer Text deutet auf ein Prompt-/Antwortproblem hin, nicht auf
        // eine Kapazitätsgrenze des Modells.
        if (!text) throw new Error("Unerwartete Antwort der KI")
        return text
      } catch (fehler) {
        letzterFehler = fehler
        if (istModellNichtVerfuegbar(fehler)) break
        if (!istVoruebergehend(fehler)) throw fehler
        const wartezeit = WARTEZEITEN_MS[versuch]
        if (wartezeit !== undefined) await warte(wartezeit)
      }
    }
  }

  throw letzterFehler
}
