import { GoogleGenAI } from "@google/genai"
import type { Nutzung } from "@/types"

export type ErkannteFelder = {
  firma: string | null
  flaeche_min: number | null
  flaeche_max: number | null
  ort: string | null
  budget_pro_m2: number | null
  bezug: string | null
  branche: string | null
  nutzung: Nutzung | null
}

const NUTZUNGEN: Nutzung[] = ["buero", "gewerbe", "produktion", "lager", "verkauf", "bauland"]

function alsString(wert: unknown): string | null {
  return typeof wert === "string" && wert.length > 0 ? wert : null
}

function alsZahl(wert: unknown): number | null {
  return typeof wert === "number" && Number.isFinite(wert) ? wert : null
}

function alsNutzung(wert: unknown): Nutzung | null {
  return typeof wert === "string" && (NUTZUNGEN as string[]).includes(wert) ? (wert as Nutzung) : null
}

export function baueErkennungsPrompt(text: string): string {
  return `Lies die folgende E-Mail einer Firma, die eine Gewerbefläche in der Region Solothurn sucht, und extrahiere die genannten Werte.

E-Mail:
"""
${text}
"""

Antworte ausschliesslich mit einem JSON-Objekt in genau diesem Format, ohne weitere Erklärung:
{"firma": string|null, "flaeche_min": number|null, "flaeche_max": number|null, "ort": string|null, "budget_pro_m2": number|null, "bezug": string|null, "branche": string|null, "nutzung": "buero"|"gewerbe"|"produktion"|"lager"|"verkauf"|"bauland"|null}

Werte, die im Text nicht vorkommen, werden null. Zahlen ohne Tausendertrennzeichen. "bezug" bleibt der Originaltext des Zeitpunkts (z.B. "Q1 2027", "sofort"). "nutzung" ist genau einer der sechs genannten Werte oder null, wenn unklar.`
}

export function parseErkennungsAntwort(antwort: string): ErkannteFelder {
  const bereinigt = antwort
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()
  const daten = JSON.parse(bereinigt) as Record<string, unknown>
  return {
    firma: alsString(daten.firma),
    flaeche_min: alsZahl(daten.flaeche_min),
    flaeche_max: alsZahl(daten.flaeche_max),
    ort: alsString(daten.ort),
    budget_pro_m2: alsZahl(daten.budget_pro_m2),
    bezug: alsString(daten.bezug),
    branche: alsString(daten.branche),
    nutzung: alsNutzung(daten.nutzung),
  }
}

export async function erkenneFelder(text: string): Promise<ErkannteFelder> {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const antwort = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: baueErkennungsPrompt(text),
  })
  if (!antwort.text) throw new Error("Unerwartete Antwort der KI")
  return parseErkennungsAntwort(antwort.text)
}
