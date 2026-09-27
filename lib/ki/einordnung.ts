import { generiereText } from "./gemini"
import { alsNutzung, alsString, alsZahl, entferneCodeZaeune, parseErkennungsAntwort } from "./erkennung"
import type { ErkannteFelder } from "./erkennung"
import type { Nutzung } from "@/types"

export type Kategorie = "suchanfrage" | "antwort" | "objektangebot" | "sonstiges"

export type ObjektDaten = {
  titel: string | null
  adresse: string | null
  ort: string | null
  flaeche: number | null
  preis_pro_m2: number | null
  nutzung: Nutzung | null
  verfuegbar_ab: string | null
  beschreibung: string | null
}

export type Einordnung = {
  kategorie: Kategorie
  felder: ErkannteFelder
  objekt: ObjektDaten
}

const KATEGORIEN: Kategorie[] = ["suchanfrage", "antwort", "objektangebot", "sonstiges"]

function alsKategorie(wert: unknown): Kategorie {
  return typeof wert === "string" && (KATEGORIEN as string[]).includes(wert) ? (wert as Kategorie) : "sonstiges"
}

// Nur ISO-Datum (YYYY-MM-DD) wird übernommen -- alles andere (Freitext wie
// "sofort", andere Formate) ist für die Weiterverarbeitung als Datum unbrauchbar.
function alsDatum(wert: unknown): string | null {
  return typeof wert === "string" && /^\d{4}-\d{2}-\d{2}$/.test(wert) ? wert : null
}

function alsObjekt(wert: unknown): Record<string, unknown> {
  return typeof wert === "object" && wert !== null ? (wert as Record<string, unknown>) : {}
}

function parseObjektDaten(wert: unknown): ObjektDaten {
  const daten = alsObjekt(wert)
  return {
    titel: alsString(daten.titel),
    adresse: alsString(daten.adresse),
    ort: alsString(daten.ort),
    flaeche: alsZahl(daten.flaeche),
    preis_pro_m2: alsZahl(daten.preis_pro_m2),
    nutzung: alsNutzung(daten.nutzung),
    verfuegbar_ab: alsDatum(daten.verfuegbar_ab),
    beschreibung: alsString(daten.beschreibung),
  }
}

export function baueEinordnungsPrompt(betreff: string, text: string): string {
  return `Ordne die folgende E-Mail an immoheart (Vermittlung von Gewerbeflächen in der Region Solothurn) genau einer Kategorie zu:
- "suchanfrage": jemand sucht eine Gewerbefläche.
- "antwort": Antwort auf eine frühere Mail von immoheart.
- "objektangebot": ein Eigentümer bietet eine Fläche zur Vermittlung an.
- "sonstiges": Werbung, Newsletter, Spam, Unklares.

Betreff:
"""
${betreff}
"""

E-Mail:
"""
${text}
"""

Antworte ausschliesslich mit einem JSON-Objekt in genau diesem Format, ohne weitere Erklärung:
{"kategorie": "suchanfrage"|"antwort"|"objektangebot"|"sonstiges", "felder": {"firma": string|null, "flaeche_min": number|null, "flaeche_max": number|null, "ort": string|null, "budget_pro_m2": number|null, "bezug": string|null, "branche": string|null, "nutzung": "buero"|"gewerbe"|"produktion"|"lager"|"verkauf"|"bauland"|null}, "objekt": {"titel": string|null, "adresse": string|null, "ort": string|null, "flaeche": number|null, "preis_pro_m2": number|null, "nutzung": "buero"|"gewerbe"|"produktion"|"lager"|"verkauf"|"bauland"|null, "verfuegbar_ab": string|null, "beschreibung": string|null}}

Nicht zutreffende Teile (z.B. "felder" bei einem Objektangebot oder "objekt" bei einer Suchanfrage) erhalten überall null-Werte. "verfuegbar_ab" nur im Format YYYY-MM-DD, sonst null.`
}

export function parseEinordnung(antwort: string): Einordnung {
  const daten = JSON.parse(entferneCodeZaeune(antwort)) as Record<string, unknown>
  return {
    kategorie: alsKategorie(daten.kategorie),
    // parseErkennungsAntwort übernimmt die komplette Feldvalidierung für
    // ErkannteFelder -- hier nur erneut über JSON gereicht statt dupliziert.
    felder: parseErkennungsAntwort(JSON.stringify(alsObjekt(daten.felder))),
    objekt: parseObjektDaten(daten.objekt),
  }
}

export async function ordneEin(betreff: string, text: string): Promise<Einordnung> {
  const antwort = await generiereText(baueEinordnungsPrompt(betreff, text))
  return parseEinordnung(antwort)
}
