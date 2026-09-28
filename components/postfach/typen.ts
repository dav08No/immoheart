import type { AnfrageWerte } from "@/lib/eingang/anfrage-aus-eingang"

// Minimaler Ausschnitt eines Entwurfs (holeEntwuerfe, page.tsx): reicht, um zu einem
// Eingang den Rückfrage-/Antwort-Entwurf zu finden und zu öffnen.
export type EntwurfVerweis = { id: string; antwort_auf: string | null; an: string; typ: string }

// werte: aktuelle Feldwerte der Anfrage -- AktionenAntwort vergleicht sie mit den
// KI-erkannten Angaben, damit "Übernehmen" nur für tatsächlich abweichende Felder erscheint.
export type AnfrageOption = { id: string; label: string; offen: boolean; werte: AnfrageWerte }

export type AktionAusfuehren = (
  schluessel: string,
  aktion: () => Promise<{ fehler: string | null }>,
  erfolg?: string
) => Promise<boolean>

// Nach lib/nutzung.ts verschoben; hier weiter exportiert für bestehende Importe.
export { NUTZUNG_OPTIONEN, nutzungLabel } from "@/lib/nutzung"

export const FELD_LABELS = {
  firma: "Firma",
  flaeche_min: "Fläche ab",
  flaeche_max: "Fläche bis",
  ort: "Ort",
  budget_pro_m2: "Budget CHF/m²",
  bezug: "Bezug",
  branche: "Branche",
  nutzung: "Nutzung",
} as const

export const AUSWAHL_KLASSE = "w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink disabled:opacity-60"

// Nur Titel + Ort für die Objekt-Auswahl (Mail-Bild als Objektfoto), keine Adresse.
export type ObjektOption = { id: string; label: string }
