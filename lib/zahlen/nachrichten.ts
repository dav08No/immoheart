// Reine Aggregationen über nachrichten (Entwürfe, Ein-/Ausgang) für die Admin-Kennzahlenseite.
import { isoWocheSchluessel, letzteMonate, letzteWochen, monatLabel, monatSchluessel, wocheLabel } from "./zeitraeume"

// Entwürfe im Erstellungsmonat gebucketet, mit ihrem späteren Schicksal (gesendet
// oder gelöscht) -- ein Entwurf ohne beides ist noch offen und zählt in keiner Spalte.
export function entwuerfeVerlauf(
  entwuerfe: { richtung: string; created_at: string; gesendet_am: string | null; geloescht_am: string | null }[],
  jetzt: Date,
  monate = 6
): { monat: string; label: string; gesendet: number; geloescht: number }[] {
  const monate_ = letzteMonate(jetzt, monate)
  const erlaubt = new Set(monate_)
  const zaehler = new Map<string, { gesendet: number; geloescht: number }>()
  for (const e of entwuerfe) {
    if (e.richtung !== "entwurf") continue
    const schluessel = monatSchluessel(new Date(e.created_at))
    if (!erlaubt.has(schluessel)) continue
    const eintrag = zaehler.get(schluessel) ?? { gesendet: 0, geloescht: 0 }
    if (e.gesendet_am) eintrag.gesendet++
    else if (e.geloescht_am) eintrag.geloescht++
    zaehler.set(schluessel, eintrag)
  }
  return monate_.map((monat) => ({ monat, label: monatLabel(monat), ...(zaehler.get(monat) ?? { gesendet: 0, geloescht: 0 }) }))
}

// Ein-/Ausgehende Mails pro ISO-Woche. "ein" = richtung "eingang" (Zeitpunkt: empfangen_am,
// sonst created_at als Fallback), "aus" = richtung "gesendet" (Zeitpunkt: gesendet_am,
// sonst created_at). Entwürfe (richtung "entwurf") gehören zu keiner der beiden Spalten.
export function mailsProWoche(
  nachrichten: { richtung: string; quelle: string | null; empfangen_am: string | null; created_at: string; gesendet_am: string | null }[],
  jetzt: Date,
  wochen = 12
): { woche: string; label: string; ein: number; aus: number }[] {
  const wochen_ = letzteWochen(jetzt, wochen)
  const erlaubt = new Set(wochen_)
  const zaehler = new Map<string, { ein: number; aus: number }>()
  const zaehle = (schluessel: string, feld: "ein" | "aus"): void => {
    if (!erlaubt.has(schluessel)) return
    const eintrag = zaehler.get(schluessel) ?? { ein: 0, aus: 0 }
    eintrag[feld]++
    zaehler.set(schluessel, eintrag)
  }
  for (const n of nachrichten) {
    if (n.richtung === "eingang") zaehle(isoWocheSchluessel(new Date(n.empfangen_am ?? n.created_at)), "ein")
    else if (n.richtung === "gesendet") zaehle(isoWocheSchluessel(new Date(n.gesendet_am ?? n.created_at)), "aus")
  }
  return wochen_.map((woche) => ({ woche, label: wocheLabel(woche), ...(zaehler.get(woche) ?? { ein: 0, aus: 0 }) }))
}
