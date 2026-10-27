// Die 5 Datenblätter des Rapports. Nur erlaubte Felder: Firmenname, Objekttitel und
// Eckdaten, keine E-Mails, Kontaktpersonen, Eigentümer oder Mailtexte (Spec Datenschutz).
import { TREFFER_STATUS_LABEL } from "@/lib/abschluss/uebergaenge"
import { nutzungLabel } from "@/lib/nutzung"
import { tageBisAbschluss } from "@/lib/zahlen/anfragen"
import { zuercherDatum } from "@/lib/zahlen/zeitraeume"
import type { Nachschlagen, RapportAuswahl } from "./auswahl"
import { ANFRAGE_STATUS_LABEL, ANGEBOT_ERGEBNIS, OBJEKT_STATUS_LABEL, quelleLabel } from "./labels"
import type { RapportRohdaten, RohAngebot } from "./roh"
import type { RapportModell, Spalte, SpaltenTyp, Tabelle, Zelle } from "./typen"

const EMAIL = /[^\s@]+@[^\s@]+/g

// Letzte Sicherung: Freitext (Firmenname aus einer Mail, Ort) könnte eine Adresse enthalten.
export function ohneEmail(text: string): string {
  return text.replace(EMAIL, "[E-Mail entfernt]")
}

function datum(zeitpunkt: string | null): string | null {
  return zeitpunkt ? zuercherDatum(new Date(zeitpunkt)) : null
}

function tabelle<K extends string>(titel: string, spalten: [K, string, SpaltenTyp][], zeilen: Record<K, Zelle>[]): Tabelle {
  return {
    titel,
    spalten: spalten.map(([schluessel, t, typ]): Spalte => ({ schluessel, titel: t, typ })),
    // Feste Schlüsselreihenfolge wie die Spalten; jeder Text läuft durch ohneEmail().
    zeilen: zeilen.map((z) =>
      Object.fromEntries(spalten.map(([s]) => {
        const wert = z[s]
        return [s, typeof wert === "string" ? ohneEmail(wert) : wert]
      }))
    ),
  }
}

const paar = (anfrageId: string | null, objektId: string | null) => `${anfrageId ?? ""}|${objektId ?? ""}`

// Archivierte Treffer verlieren ihre match_id in nachrichten (on delete set null), darum
// zusätzlich über das Paar Anfrage/Objekt suchen.
export function angebotErgebnis(angebot: RohAngebot, roh: Pick<RapportRohdaten, "treffer" | "trefferArchiv">): string {
  const treffer =
    roh.treffer.find((t) => t.id === angebot.match_id) ??
    roh.treffer.find((t) => angebot.anfrage_id && paar(t.anfrage_id, t.objekt_id) === paar(angebot.anfrage_id, angebot.objekt_id))
  if (treffer) return ANGEBOT_ERGEBNIS[treffer.status]
  const archiviert = roh.trefferArchiv.some(
    (t) => t.match_id === angebot.match_id || (angebot.anfrage_id && paar(t.anfrage_id, t.objekt_id) === paar(angebot.anfrage_id, angebot.objekt_id))
  )
  return archiviert ? "archiviert" : "angeboten"
}

export function baueTabellen(a: RapportAuswahl, roh: RapportRohdaten, n: Nachschlagen): RapportModell["tabellen"] {
  const titel = (objektId: string | null) => n.objekt(objektId)?.titel ?? null
  const angeboteJeObjekt = new Map<string, number>()
  for (const x of a.angebote) if (x.objekt_id) angeboteJeObjekt.set(x.objekt_id, (angeboteJeObjekt.get(x.objekt_id) ?? 0) + 1)

  return {
    vermittlungen: tabelle(
      "Vermittlungen",
      [["datum", "Datum", "datum"], ["firma", "Firma", "text"], ["objekt", "Objekt", "text"], ["flaeche", "Fläche m²", "zahl"], ["preisProM2", "Preis/m²", "chf"], ["tageBisAbschluss", "Tage bis Abschluss", "zahl"]],
      a.vermittlungen.map((v) => {
        const objekt = n.objekt(v.objektId)
        const erstellt = n.anfrage(v.anfrageId)?.created_at
        const tage = erstellt ? tageBisAbschluss([{ anfrage_erstellt: erstellt, abgeschlossen_am: v.abgeschlossenAm }]).median : null
        return {
          datum: datum(v.abgeschlossenAm), firma: n.firma(v.anfrageId), objekt: objekt?.titel ?? null,
          flaeche: objekt?.flaeche ?? null, preisProM2: objekt?.preis_pro_m2 ?? null,
          tageBisAbschluss: tage === null ? null : Math.round(tage * 10) / 10,
        }
      })
    ),
    angebote: tabelle(
      "Angebote",
      [["gesendet", "Gesendet", "datum"], ["firma", "Firma", "text"], ["objekt", "Objekt", "text"], ["ergebnis", "Ergebnis", "text"]],
      a.angebote.map((x) => ({ gesendet: datum(x.gesendet_am), firma: n.firma(x.anfrage_id), objekt: titel(x.objekt_id), ergebnis: angebotErgebnis(x, roh) }))
    ),
    treffer: tabelle(
      "Treffer",
      [["firma", "Firma", "text"], ["objekt", "Objekt", "text"], ["score", "Score", "zahl"], ["status", "Status", "text"], ["erstellt", "Erstellt", "datum"], ["archiviertAm", "Archiviert am", "datum"], ["grund", "Grund", "text"]],
      a.trefferZeilen.map((t) => ({
        firma: n.firma(t.anfrageId), objekt: titel(t.objektId), score: t.score, status: TREFFER_STATUS_LABEL[t.status],
        erstellt: datum(t.erstellt), archiviertAm: datum(t.archiviertAm), grund: t.grund,
      }))
    ),
    anfragen: tabelle(
      "Anfragen",
      [["eingang", "Eingang", "datum"], ["firma", "Firma", "text"], ["nutzung", "Nutzung", "text"], ["flaecheMin", "Fläche min m²", "zahl"], ["flaecheMax", "Fläche max m²", "zahl"], ["ort", "Ort", "text"], ["budgetProM2", "Budget/m²", "chf"], ["quelle", "Quelle", "text"], ["status", "Status", "text"], ["archiviert", "Archiviert", "datum"]],
      a.anfragen.map((x) => ({
        eingang: datum(x.created_at), firma: n.firma(x.id), nutzung: nutzungLabel(x.nutzung), flaecheMin: x.flaeche_min, flaecheMax: x.flaeche_max,
        ort: x.ort, budgetProM2: x.budget_pro_m2, quelle: quelleLabel(x.quelle), status: ANFRAGE_STATUS_LABEL[x.status], archiviert: datum(x.archiviert_am),
      }))
    ),
    objekte: tabelle(
      "Objekte",
      [["erfasst", "Erfasst", "datum"], ["titel", "Titel", "text"], ["ort", "Ort", "text"], ["flaeche", "Fläche m²", "zahl"], ["preisProM2", "Preis/m²", "chf"], ["nutzung", "Nutzung", "text"], ["status", "Status", "text"], ["angebote", "Angebote", "zahl"], ["archiviert", "Archiviert", "datum"]],
      a.objekte.map((o) => ({
        erfasst: datum(o.created_at), titel: o.titel, ort: o.ort, flaeche: o.flaeche, preisProM2: o.preis_pro_m2, nutzung: nutzungLabel(o.nutzung),
        status: OBJEKT_STATUS_LABEL[o.status], angebote: angeboteJeObjekt.get(o.id) ?? 0, archiviert: datum(o.archiviert_am),
      }))
    ),
  }
}
