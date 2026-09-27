// Öffentliches Suchauftrag-Formular: Schema + reine Textbausteine für Eingang und
// Antwort-Entwurf. Kein Versand, keine KI -- die Angaben kommen schon strukturiert
// und werden direkt als erkannte Felder abgelegt (ki_status "fertig").
import { z } from "zod"
import type { ErkannteFelder } from "@/lib/ki/erkennung"
import { nutzungLabel } from "@/lib/nutzung"
import { emailFeld, firmaFeld, nameFeld, telefonFeld, type NachrichtEinfuegen } from "@/lib/website-eintrag"
import type { Nutzung } from "@/types"

const NUTZUNGEN = ["buero", "gewerbe", "produktion", "lager", "verkauf", "bauland"] as const satisfies readonly Nutzung[]
const GANZZAHL_MELDUNG = "Bitte eine ganze Zahl angeben."

// Formularfelder kommen als String; "" heisst "keine Angabe". Text wird zu NaN und
// scheitert dann an z.number mit derselben verständlichen Meldung.
function optionaleGanzzahl(max: number) {
  return z.preprocess(
    (wert) => {
      if (typeof wert !== "string") return wert ?? undefined
      const getrimmt = wert.trim()
      return getrimmt === "" ? undefined : Number(getrimmt)
    },
    z
      .number({ error: GANZZAHL_MELDUNG })
      .int(GANZZAHL_MELDUNG)
      .min(0, "Die Zahl darf nicht negativ sein.")
      .max(max, `Höchstens ${max}.`)
      .optional()
  )
}

function optionalerText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Höchstens ${max} Zeichen.`)
    .optional()
    .transform((wert) => (wert === "" ? undefined : wert))
}

export const suchauftragSchema = z
  .object({
    firma: firmaFeld,
    name: nameFeld,
    email: emailFeld,
    telefon: telefonFeld,
    nutzung: z.enum(NUTZUNGEN, { error: "Bitte wählen Sie eine Nutzung." }),
    ort: z.string().trim().min(1, "Bitte geben Sie einen Ort an.").max(80, "Höchstens 80 Zeichen."),
    flaecheMin: optionaleGanzzahl(100000),
    flaecheMax: optionaleGanzzahl(100000),
    budgetProM2: optionaleGanzzahl(10000),
    bezug: optionalerText(80),
    nachricht: optionalerText(2000),
  })
  // Vertauschte Grenzen sind ein Versehen, kein Fehler -- stillschweigend korrigieren,
  // damit das Matching (flaeche_min ≤ flaeche_max) funktioniert.
  .transform((s) =>
    s.flaecheMin !== undefined && s.flaecheMax !== undefined && s.flaecheMin > s.flaecheMax
      ? { ...s, flaecheMin: s.flaecheMax, flaecheMax: s.flaecheMin }
      : s
  )

export type Suchauftrag = z.infer<typeof suchauftragSchema>

export function suchauftragFelder(s: Suchauftrag): ErkannteFelder {
  return {
    firma: s.firma,
    branche: null,
    flaeche_min: s.flaecheMin ?? null,
    flaeche_max: s.flaecheMax ?? null,
    ort: s.ort,
    budget_pro_m2: s.budgetProM2 ?? null,
    bezug: s.bezug ?? null,
    nutzung: s.nutzung,
  }
}

function nutzungText(s: Suchauftrag): string {
  return nutzungLabel(s.nutzung) ?? s.nutzung
}

function flaecheText(s: Suchauftrag): string | null {
  const { flaecheMin: min, flaecheMax: max } = s
  if (min !== undefined && max !== undefined) return `${min}–${max} m²`
  if (min !== undefined) return `ab ${min} m²`
  if (max !== undefined) return `bis ${max} m²`
  return null
}

function budgetText(s: Suchauftrag): string | null {
  return s.budgetProM2 !== undefined ? `CHF ${s.budgetProM2}/m²` : null
}

function betreff(s: Suchauftrag): string {
  return `Suchauftrag: ${nutzungText(s)} in ${s.ort}`
}

export function suchauftragNachricht(s: Suchauftrag, an: string): NachrichtEinfuegen {
  const zeilen = [
    `Firma: ${s.firma}`,
    `Name: ${s.name}`,
    `E-Mail: ${s.email}`,
    `Telefon: ${s.telefon ?? "-"}`,
    `Nutzung: ${nutzungText(s)}`,
    `Ort: ${s.ort}`,
    `Fläche: ${flaecheText(s) ?? "-"}`,
    `Budget: ${budgetText(s) ?? "-"}`,
    `Bezug: ${s.bezug ?? "-"}`,
  ]
  if (s.nachricht) zeilen.push("", s.nachricht)
  return {
    richtung: "eingang",
    typ: "anfrage",
    quelle: "website",
    kategorie: "suchanfrage",
    ki_status: "fertig",
    gelesen: false,
    von: s.email,
    an,
    betreff: betreff(s),
    body: zeilen.join("\n"),
    erkannte_felder: {
      ...suchauftragFelder(s),
      kontakt: { name: s.name, email: s.email, telefon: s.telefon ?? null, nachricht: s.nachricht ?? null },
    },
  }
}

export function suchauftragEntwurf(s: Suchauftrag): { betreff: string; body: string } {
  // Nur Angaben, die tatsächlich gemacht wurden -- keine "-"-Zeilen im Entwurf.
  const zusammenfassung = [
    `Nutzung: ${nutzungText(s)}`,
    `Ort: ${s.ort}`,
    flaecheText(s) && `Fläche: ${flaecheText(s)}`,
    budgetText(s) && `Budget: ${budgetText(s)}`,
    s.bezug && `Bezug: ${s.bezug}`,
  ].filter((zeile): zeile is string => Boolean(zeile))

  const body = [
    `Guten Tag ${s.name}`,
    "",
    "Vielen Dank für Ihren Suchauftrag. Wir haben folgende Angaben erhalten:",
    ...zusammenfassung.map((zeile) => `- ${zeile}`),
    "",
    "Wir melden uns mit passenden Objekten bei Ihnen.",
    "",
    "Freundliche Grüsse",
    "immoheart",
  ].join("\n")
  return { betreff: `Re: ${betreff(s)}`, body }
}
