// Texte für die Python-Funktion bereinigen: Python lehnt Steuerzeichen, einzelne Surrogate
// und zu lange Texte ab (api/_rapport/pruefung.py) -- ein einziger solcher Firmenname
// würde sonst den ganzen Rapport mit 502 abbrechen.
import type { RapportZusammenfassung } from "./typen"

// Grenzen wie in api/_rapport/modell.py (MAX_ZELLE, MAX_KI_ABSCHNITT).
export const MAX_ZELLE = 500
export const MAX_KI_ABSCHNITT = 1500

// Einzelne (ungepaarte) UTF-16-Surrogate; die TS-Lib (ES2022) kennt toWellFormed() noch nicht.
const EINZELNES_SURROGAT = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g
// Ersatzzeichen U+FFFD, wie toWellFormed() es einsetzt.
const ERSATZ = String.fromCodePoint(0xfffd)
// Dieselbe Menge wie STEUERZEICHEN in pruefung.py; Tab und Umbrüche bleiben erlaubt.
const STEUERZEICHEN = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g

export function bereinigeText(text: string, max: number): string {
  const sauber = text.replace(EINZELNES_SURROGAT, ERSATZ).replace(STEUERZEICHEN, "")
  // Nach Codepunkten kürzen wie Pythons len(), ohne ein Surrogat-Paar zu zerschneiden.
  const zeichen = Array.from(sauber)
  return zeichen.length > max ? zeichen.slice(0, max).join("") : sauber
}

export function bereinigeZusammenfassung(z: RapportZusammenfassung): RapportZusammenfassung {
  if ("fehler" in z) return { fehler: bereinigeText(z.fehler, MAX_ZELLE) }
  const t = z.text
  return {
    text: {
      rueckblick: bereinigeText(t.rueckblick, MAX_KI_ABSCHNITT),
      trends: bereinigeText(t.trends, MAX_KI_ABSCHNITT),
      auffaelligkeiten: bereinigeText(t.auffaelligkeiten, MAX_KI_ABSCHNITT),
      ausblick: bereinigeText(t.ausblick, MAX_KI_ABSCHNITT),
    },
  }
}
