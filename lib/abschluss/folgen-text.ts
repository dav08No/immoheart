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
// Objekts; beim Reservieren bewusst der Hinweis, dass sie noch KEINE Absage bekommen.
export function folgenText(aktion: TrefferAktion, andere: number): string {
  const eine = andere === 1
  switch (aktion) {
    case "reservieren":
      if (andere === 0) return "Keine andere Firma hat ein Angebot für dieses Objekt"
      return eine
        ? "1 andere Firma hat ein Angebot – sie erhält erst bei Vertragsabschluss eine Absage"
        : `${andere} andere Firmen haben ein Angebot – sie erhalten erst bei Vertragsabschluss eine Absage`
    case "vermitteln":
      if (andere === 0) return "Keine andere Firma hat ein Angebot – es entstehen keine Absagen"
      return eine ? "1 andere Firma erhält einen Absage-Entwurf" : `${andere} andere Firmen erhalten einen Absage-Entwurf`
    case "aufheben":
      return "Das Objekt wird wieder verfügbar, die anderen Angebote bleiben bestehen"
    case "ablehnen":
      return "Der Treffer wird als abgelehnt markiert, es entsteht keine Mail"
  }
}

// R6/R9: Ist die Anfrage schon vermittelt, darf ein anderswo noch reservierter Treffer
// nicht ein zweites Mal abschliessen -- nur die Reservierung lässt sich noch lösen.
// erlaubteAktionen selbst bleibt unverändert (Spiegel der DB-Regeln).
export function sichtbareAktionen(treffer: TrefferStatus, objekt: ObjektStatus, anfrage: AnfrageStatus): TrefferAktion[] {
  const aktionen = erlaubteAktionen(treffer, objekt).filter((a) => !(anfrage === "vermittelt" && a === "vermitteln"))
  return [...aktionen.filter((a) => !istPrimaerAktion(a)), ...aktionen.filter(istPrimaerAktion)]
}
