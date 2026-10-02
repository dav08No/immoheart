import { AUSGABEFORMAT, frageKi, zitat, type Mailentwurf } from "./entwuerfe"

// Rolle je Empfänger -- ohne klare Rolle schrieb die KI im Live-Test (siehe entwuerfe.ts)
// schon einmal aus der falschen Perspektive.
const ABSAGE_ROLLE =
  "Du schreibst im Namen von immoheart (dem Vermittler) eine Absage an eine Firma, die ein Angebot für eine Fläche erhalten hatte."
const EIGENTUEMER_ROLLE = "Du schreibst im Namen von immoheart (dem Vermittler) an den Eigentümer einer Fläche."
const BESTAETIGUNG_ROLLE =
  "Du schreibst im Namen von immoheart (dem Vermittler) an eine Firma, die soeben eine Fläche gemietet hat."

const KEINE_ERFINDUNGEN = "Erfinde keine Termine, Preise oder Objekte."

export function baueAbsagePrompt(p: { objektTitel: string; anfrageKurz: string | null }): string {
  const bezug = p.anfrageKurz ? `\nDie Firma sucht: ${p.anfrageKurz}\n` : ""
  return `${ABSAGE_ROLLE} Die Fläche "${p.objektTitel}" ist nicht mehr verfügbar, ein anderes Angebot kam zum Abschluss.
${bezug}
Schreibe eine kurze Absage-Mail: teile mit, dass die Fläche vergeben ist, und dass immoheart weiterhin nach einer passenden Fläche für die Firma sucht. ${KEINE_ERFINDUNGEN} ${AUSGABEFORMAT}`
}

export function entwurfAbsage(p: { objektTitel: string; anfrageKurz: string | null }): Promise<Mailentwurf> {
  return frageKi(baueAbsagePrompt(p))
}

export type EigentuemerAnlass = "reserviert" | "vermietet" | "aufgehoben" | "meldung_dank"

// Je Anlass eine eigene, klare Anweisung -- eine gemeinsame Formulierung mit
// Platzhaltern führte im Entwurf zu unklaren/falschen Aussagen je nach Fall.
const ANLASS_ANWEISUNG: Record<EigentuemerAnlass, string> = {
  reserviert: "Die Fläche wurde soeben für eine Firma reserviert. Informiere den Eigentümer kurz darüber.",
  vermietet: "Die Fläche wurde über immoheart erfolgreich vermietet. Informiere den Eigentümer und bedanke dich für die Zusammenarbeit.",
  aufgehoben: "Die Reservierung der Fläche wurde aufgehoben, sie ist wieder verfügbar. Informiere den Eigentümer kurz darüber.",
  meldung_dank: "Bedanke dich beim Eigentümer für die Meldung der Änderung an der Fläche.",
}

export function baueEigentuemerInfoPrompt(p: { objektTitel: string; anlass: EigentuemerAnlass; meldung?: string }): string {
  // Nur bei meldung_dank gibt es i.d.R. eine Meldung zum Zitieren; sonst leer.
  const meldungBlock = p.meldung ? `\nMeldung des Eigentümers:\n${zitat(p.meldung)}\n` : ""
  return `${EIGENTUEMER_ROLLE} Fläche: "${p.objektTitel}".
${meldungBlock}
${ANLASS_ANWEISUNG[p.anlass]} ${KEINE_ERFINDUNGEN} ${AUSGABEFORMAT}`
}

export function entwurfEigentuemerInfo(p: { objektTitel: string; anlass: EigentuemerAnlass; meldung?: string }): Promise<Mailentwurf> {
  return frageKi(baueEigentuemerInfoPrompt(p))
}

export function baueBestaetigungPrompt(p: { objektTitel: string; firma: string | null }): string {
  const firmaZeile = p.firma ? `\nFirma: ${p.firma}\n` : ""
  return `${BESTAETIGUNG_ROLLE} Fläche: "${p.objektTitel}".
${firmaZeile}
Schreibe eine kurze Mail, die sich über den erfolgreichen Abschluss freut und die nächsten Schritte offen anspricht (z. B. dass sich immoheart für Details meldet), ohne sie konkret zu erfinden. ${KEINE_ERFINDUNGEN} ${AUSGABEFORMAT}`
}

export function entwurfBestaetigung(p: { objektTitel: string; firma: string | null }): Promise<Mailentwurf> {
  return frageKi(baueBestaetigungPrompt(p))
}
