import { generiereText } from "./gemini"
import type { Anfrage, Kriterium, Objekt } from "@/types"
import type { ErkannteFelder } from "./erkennung"

export type Mailentwurf = { betreff: string; body: string }

const AUSGABEFORMAT =
  'Antworte ausschliesslich mit einem JSON-Objekt in genau diesem Format, ohne weitere Erklärung: {"betreff": string, "body": string}. Der Ton ist knapp, sachlich, per Sie, ohne Floskeln. Unterschrift: "Freundliche Grüsse\\nimmoheart".'

export function parseMailAntwort(antwort: string): Mailentwurf {
  const bereinigt = antwort
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()
  const daten = JSON.parse(bereinigt) as Record<string, unknown>
  // Bewusst werfen statt auf einen leeren/generischen Platzhalter
  // auszuweichen: ein stiller Fallback auf body: "" würde einen Entwurf mit
  // leerem Text im Postfach ablegen, der beim Senden unbemerkt als leere
  // E-Mail an eine Firma rausginge, statt dass der eigentliche KI-Fehler
  // sichtbar wird.
  if (typeof daten.betreff !== "string" || typeof daten.body !== "string") {
    throw new Error("Unerwartete Antwort der KI: betreff/body fehlen oder haben falschen Typ")
  }
  return { betreff: daten.betreff, body: daten.body }
}

async function frageKi(prompt: string): Promise<Mailentwurf> {
  const antwort = await generiereText(prompt)
  return parseMailAntwort(antwort)
}

// Menschenlesbare Labels statt der rohen snake_case-Schlüssel im Prompt:
// eine KI, die aufgefordert wird, nach "budget_pro_m2" statt nach "Budget
// pro m²" zu fragen, übernimmt den technischen Bezeichner erfahrungsgemäss
// öfter wörtlich in den generierten Text, statt ihn zu übersetzen. Der rohe
// Schlüssel bleibt zusätzlich im Text (nicht nur das Label), damit die
// bestehenden toContain-Tests unverändert gültig bleiben.
const FELD_LABELS: Record<string, string> = {
  firma: "Firma", flaeche_min: "Fläche min.", flaeche_max: "Fläche max.",
  ort: "Ort", budget_pro_m2: "Budget pro m²", bezug: "Bezugstermin",
  branche: "Branche", nutzung: "Nutzungsart",
}

export function baueRueckfragePrompt(felder: ErkannteFelder): string {
  const fehlend = (Object.entries(felder) as [string, unknown][])
    .filter(([, wert]) => wert === null)
    .map(([schluessel]) => `${schluessel} (${FELD_LABELS[schluessel] ?? schluessel})`)
  return `Eine Firma hat eine Anfrage nach einer Gewerbefläche geschickt. Folgende Angaben fehlen noch: ${fehlend.join(", ")}.

Schreibe eine kurze Rückfrage-Mail, die genau nach diesen fehlenden Angaben fragt. ${AUSGABEFORMAT}`
}

export function entwurfRueckfrage(felder: ErkannteFelder): Promise<Mailentwurf> {
  return frageKi(baueRueckfragePrompt(felder))
}

// anfrage wird aktuell nicht im Prompt verwendet (nur objekt/kriterien/hinweis)
// -- bleibt Teil der Signatur für künftige Personalisierung ab M8, siehe
// "Produces"-Zeile oben. Absichtlich nicht entfernen.
export function baueAngebotPrompt(anfrage: Anfrage, objekt: Objekt, kriterien: Kriterium[], hinweis: string): string {
  const kriterienText = kriterien
    .map((k) => `- ${k.kriterium}: gesucht ${k.gesucht}, Objekt ${k.angeboten} (${k.status})`)
    .join("\n")
  return `Eine Firma sucht eine Gewerbefläche. Folgendes Objekt passt:

Objekt: ${objekt.titel}, ${objekt.flaeche} m², ${objekt.preisProM2 !== null ? `CHF ${objekt.preisProM2}/m²` : "Preis auf Anfrage"}
Vergleich:
${kriterienText}
Wichtigster Hinweis: ${hinweis}

Schreibe eine kurze Angebots-Mail an die Firma, die das Objekt vorstellt und zu einer Besichtigung einlädt. ${AUSGABEFORMAT}`
}

export function entwurfAngebot(
  anfrage: Anfrage,
  objekt: Objekt,
  kriterien: Kriterium[],
  hinweis: string
): Promise<Mailentwurf> {
  return frageKi(baueAngebotPrompt(anfrage, objekt, kriterien, hinweis))
}

export function baueNachfassPrompt(anfrage: Anfrage, tageSeitKontakt: number): string {
  return `Eine Firma sucht seit ${tageSeitKontakt} Tagen eine Gewerbefläche in ${anfrage.ort ?? "unbekanntem Ort"}, es gab seither keinen Kontakt mehr.

Schreibe eine kurze Nachfass-Mail, die freundlich fragt, ob die Suche noch aktuell ist. ${AUSGABEFORMAT}`
}

export function entwurfNachfass(anfrage: Anfrage, tageSeitKontakt: number): Promise<Mailentwurf> {
  return frageKi(baueNachfassPrompt(anfrage, tageSeitKontakt))
}

// Eingehende Mails können sehr lang sein; für einen Antwortentwurf reicht der Anfang.
const MAX_PROMPT_TEXT = 6_000

function zitat(text: string): string {
  return `"""\n${text.slice(0, MAX_PROMPT_TEXT)}\n"""`
}

export function baueAntwortPrompt(p: { eingangBetreff: string; eingangText: string; anfrageKurz: string | null }): string {
  const bezug = p.anfrageKurz ? `\nDie Firma sucht: ${p.anfrageKurz}\n` : ""
  return `Eine Firma hat auf eine Mail von immoheart (Vermittlung von Gewerbeflächen in der Region Solothurn) geantwortet.
${bezug}
Betreff:
${zitat(p.eingangBetreff)}

Mail:
${zitat(p.eingangText)}

Schreibe einen kurzen Antwortentwurf, der auf die Mail eingeht. Erfinde keine Objekte, Preise oder Termine. ${AUSGABEFORMAT}`
}

export function entwurfAntwort(p: { eingangBetreff: string; eingangText: string; anfrageKurz: string | null }): Promise<Mailentwurf> {
  return frageKi(baueAntwortPrompt(p))
}

export const FOTO_BITTE = "Bitte freundlich darum, Fotos der Fläche als Anhang zu schicken."

export function baueObjektangebotPrompt(p: { betreff: string; text: string; hatBilder: boolean }): string {
  const fotos = p.hatBilder ? "" : `\n${FOTO_BITTE}`
  return `Ein Eigentümer bietet immoheart (Vermittlung von Gewerbeflächen in der Region Solothurn) eine Fläche zur Vermittlung an.

Betreff:
${zitat(p.betreff)}

Mail:
${zitat(p.text)}

Schreibe eine kurze Antwort, die für das Angebot dankt und fehlende wichtige Angaben (Fläche, Preis, Verfügbarkeit, Nutzung) erfragt.${fotos} ${AUSGABEFORMAT}`
}

export function entwurfObjektangebot(p: { betreff: string; text: string; hatBilder: boolean }): Promise<Mailentwurf> {
  return frageKi(baueObjektangebotPrompt(p))
}
