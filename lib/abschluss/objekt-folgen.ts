import type { ObjektStatus } from "./uebergaenge"

// Aktionen am Objekt selbst (Objekt-Panel), seit der Status nicht mehr frei setzbar ist.
export type ObjektAktion = "nicht_verfuegbar" | "wieder_verfuegbar"

export const OBJEKT_AKTION_LABEL: Record<ObjektAktion, string> = {
  nicht_verfuegbar: "Nicht mehr verfügbar",
  wieder_verfuegbar: "Wieder verfügbar setzen",
}

export const OBJEKT_AKTION_FRAGE: Record<ObjektAktion, string> = {
  nicht_verfuegbar: "Objekt nicht mehr verfügbar?",
  wieder_verfuegbar: "Objekt wieder verfügbar setzen?",
}

// R11: "Nicht mehr verfügbar" auch ohne Eigentümer-Mail, sonst liesse sich ein anderweitig
// vermietetes Objekt nicht mehr schliessen. Reihenfolge: Rückweg links, Abschluss rechts.
export function objektAktionen(status: ObjektStatus): ObjektAktion[] {
  if (status === "verfuegbar") return ["nicht_verfuegbar"]
  if (status === "reserviert") return ["wieder_verfuegbar", "nicht_verfuegbar"]
  return ["wieder_verfuegbar"]
}

// Folgen im Bestätigungsdialog (Spec §1); "absagen" = Treffer, die einen Absage-Entwurf erhalten.
export function objektFolgenText(aktion: ObjektAktion, absagen: number): string {
  if (aktion === "wieder_verfuegbar") {
    return "Das Objekt wird wieder verfügbar und neu gematcht. Abgeschlossene Vermittlungen bleiben als Verlauf erhalten"
  }
  const satz = "Das Objekt wird als vermietet markiert."
  if (absagen === 0) return `${satz} Keine Firma hat ein offenes Angebot – es entstehen keine Absagen`
  return absagen === 1 ? `${satz} 1 Firma erhält einen Absage-Entwurf` : `${satz} ${absagen} Firmen erhalten einen Absage-Entwurf`
}
