// mailto-Links der Website ("per E-Mail senden"). Betreff und Text werden immer mit
// encodeURIComponent kodiert, damit &, ?, # oder Umlaute den Link nicht zerbrechen.
export const IMMOHEART_MAIL = "immoheart.business@gmail.com"

export function mailtoLink(betreff: string, text: string): string {
  // Einheitlich \n, damit Windows-Zeilenumbrüche nicht als %0D%0A doppelt erscheinen.
  const normalisiert = text.replace(/\r\n?/g, "\n")
  return `mailto:${IMMOHEART_MAIL}?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(normalisiert)}`
}

export const SUCHAUFTRAG_VORLAGE: { betreff: string; text: string } = {
  betreff: "Suchauftrag Gewerbefläche",
  text: [
    "Guten Tag",
    "",
    "Wir suchen eine Gewerbefläche mit folgenden Angaben:",
    "",
    "Firma: ",
    "Branche: ",
    "Nutzung (Büro, Gewerbe, Produktion, Lager, Verkauf, Bauland): ",
    "Ort / Region: ",
    "Fläche (m², von–bis): ",
    "Budget (CHF pro m²): ",
    "Bezug ab: ",
    "",
    "Freundliche Grüsse",
  ].join("\n"),
}

export const INSERIEREN_VORLAGE: { betreff: string; text: string } = {
  betreff: "Objekt inserieren",
  text: [
    "Guten Tag",
    "",
    "Wir möchten folgendes Objekt bei immoheart inserieren:",
    "",
    "Adresse: ",
    "Fläche (m²): ",
    "Preis (CHF pro m²): ",
    "Nutzung (Büro, Gewerbe, Produktion, Lager, Verkauf, Bauland): ",
    "Verfügbar ab: ",
    "",
    "Bitte Fotos als Anhang mitsenden.",
    "",
    "Freundliche Grüsse",
  ].join("\n"),
}
