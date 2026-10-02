import type { ObjektStatus, TrefferStatus } from "./uebergaenge"

export type Angebot = {
  id: string
  status: TrefferStatus
  angeboten_am: string | null
  objekt: { id: string; titel: string; status: ObjektStatus }
  // Firmenname, wenn das Objekt für einen ANDEREN Treffer reserviert ist.
  reserviertFuer: string | null
  // Weitere angebotene (gesendet) Treffer desselben Objekts -- für den Folgen-Dialog.
  andereAngebote: number
  // Offene KI-Platzhalter des Objekts (zuFuellendePlatzhalter), für "N Entwürfe fehlen".
  fehlendeEntwuerfe: number
}

export type EigenerTreffer = Pick<Angebot, "id" | "status" | "angeboten_am" | "objekt">
export type ObjektTreffer = { id: string; objekt_id: string; status: TrefferStatus; firma: string | null }

// Rein, damit die Zählregel ("andere" = gesendet, ohne den eigenen Treffer) testbar ist.
export function baueAngebote(eigene: EigenerTreffer[], objektTreffer: ObjektTreffer[], fehlend: Map<string, number>): Angebot[] {
  return eigene.map((t) => {
    const andere = objektTreffer.filter((o) => o.objekt_id === t.objekt.id && o.id !== t.id)
    const reservierung = andere.find((o) => o.status === "reserviert")
    return {
      ...t,
      reserviertFuer: reservierung ? (reservierung.firma ?? "eine andere Firma") : null,
      andereAngebote: andere.filter((o) => o.status === "gesendet").length,
      fehlendeEntwuerfe: fehlend.get(t.objekt.id) ?? 0,
    }
  })
}
