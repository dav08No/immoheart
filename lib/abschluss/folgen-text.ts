import { erlaubteAktionen, type ObjektStatus, type TrefferAktion, type TrefferStatus } from "./uebergaenge"
import type { Database } from "@/types/database"

type AnfrageStatus = Database["public"]["Enums"]["anfrage_status_enum"]

export const AKTION_LABEL: Record<TrefferAktion, string> = {
  reservieren: "Reservieren",
  vermitteln: "Vertrag unterschrieben",
  aufheben: "Reservierung aufheben",
  ablehnen: "Firma lehnt ab",
}

export const AKTION_FRAGE: Record<TrefferAktion, string> = {
  reservieren: "Objekt reservieren?",
  vermitteln: "Vertrag unterschrieben?",
  aufheben: "Reservierung aufheben?",
  ablehnen: "Als abgelehnt markieren?",
}

// Die Primäraktion führt den Abschluss weiter; sie steht zuletzt, also rechts (Ruling R3).
const PRIMAER: readonly TrefferAktion[] = ["reservieren", "vermitteln"]

export function istPrimaerAktion(aktion: TrefferAktion): boolean {
  return PRIMAER.includes(aktion)
}

// Folgen im Bestätigungsdialog (Spec §1). "andere" = weitere angebotene Treffer desselben
// Objekts; gezählt werden Treffer bzw. Absage-Entwürfe, nicht Firmen (eine Firma kann
// mehrere Anfragen haben). Beim Reservieren bewusst der Hinweis: noch KEINE Absage.
export function folgenText(aktion: TrefferAktion, andere: number): string {
  const eine = andere === 1
  switch (aktion) {
    case "reservieren":
      if (andere === 0) return "Keine weiteren Angebote zu diesem Objekt"
      return eine
        ? "1 weiteres Angebot zu diesem Objekt – Absage erst bei Vertragsabschluss"
        : `${andere} weitere Angebote zu diesem Objekt – Absagen erst bei Vertragsabschluss`
    case "vermitteln":
      if (andere === 0) return "Keine weiteren Angebote – es entstehen keine Absagen"
      return absageEntwuerfeText(andere)
    case "aufheben":
      return "Das Objekt wird wieder verfügbar, die anderen Angebote bleiben bestehen"
    case "ablehnen":
      return "Der Treffer wird als abgelehnt markiert, es entsteht keine Mail"
  }
}

// R6/R9/R10: Ist die Anfrage schon vermittelt, schliesst kein weiterer Treffer mehr ab.
// Ein reservierter lässt sich nur noch aufheben, ein angebotener nur ablehnen -- Reservieren
// führte sonst in eine Sackgasse (Vermitteln ausgeblendet, Objekt bliebe blockiert).
// erlaubteAktionen selbst bleibt unverändert (Spiegel der DB-Regeln).
export function sichtbareAktionen(treffer: TrefferStatus, objekt: ObjektStatus, anfrage: AnfrageStatus): TrefferAktion[] {
  const aktionen = erlaubteAktionen(treffer, objekt).filter(
    (a) => !(anfrage === "vermittelt" && (a === "vermitteln" || a === "reservieren"))
  )
  return [...aktionen.filter((a) => !istPrimaerAktion(a)), ...aktionen.filter(istPrimaerAktion)]
}

// Gemeinsam mit dem Objekt-Dialog ("nicht verfügbar"): die Zahl meint Entwürfe.
export function absageEntwuerfeText(anzahl: number): string {
  return anzahl === 1 ? "1 Absage-Entwurf wird erstellt" : `${anzahl} Absage-Entwürfe werden erstellt`
}

// Ruling R15: direkt nach der Aktion entstehen die KI-Texte noch im Hintergrund -- dann kein
// "fehlen", das nach einem Fehler klingt.
export function fehlendText(anzahl: number, hintergrund: boolean): string {
  if (hintergrund) {
    const teil = anzahl === 1 ? "1 Entwurf wird" : `${anzahl} Entwürfe werden`
    return `${teil} im Hintergrund erstellt – Seite in einem Moment neu laden`
  }
  return anzahl === 1 ? "1 Entwurf fehlt" : `${anzahl} Entwürfe fehlen`
}
