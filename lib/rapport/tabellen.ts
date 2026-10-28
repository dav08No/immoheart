// Die 5 Datenblätter des Rapports. Nur erlaubte Felder: Firmenname, Objekttitel und
// Eckdaten, keine E-Mails, Kontaktpersonen, Eigentümer oder Mailtexte (Spec Datenschutz).
import { TREFFER_STATUS_LABEL } from "@/lib/abschluss/uebergaenge"
import { nutzungLabel } from "@/lib/nutzung"
import { zuercherDatum } from "@/lib/zahlen/zeitraeume"
import { paarSchluessel, type Nachschlagen, type RapportAuswahl } from "./auswahl"
import { bereinigeText, MAX_ZELLE } from "./bereinigen"
import { ANFRAGE_STATUS_LABEL, ANGEBOT_ERGEBNIS, OBJEKT_STATUS_LABEL, quelleLabel } from "./labels"
import type { RapportRohdaten, RohAngebot } from "./roh"
import type { RapportModell, Spalte, SpaltenTyp, Tabelle, Zelle } from "./typen"
import { tageZwischen } from "./zeitraum"
import type { Database } from "@/types/database"

type TrefferStatus = Database["public"]["Enums"]["match_status_enum"]

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
    // Feste Schlüsselreihenfolge wie die Spalten; jeder Text läuft durch ohneEmail() und
    // wird danach bereinigt (Ersetzung kann verlängern, darum erst danach kürzen).
    zeilen: zeilen.map((z) =>
      Object.fromEntries(spalten.map(([s]) => {
        const wert = z[s]
        return [s, typeof wert === "string" ? bereinigeText(ohneEmail(wert), MAX_ZELLE) : wert]
      }))
    ),
  }
}

type Episode = { status: TrefferStatus; ab: string; bis: string | null; archiviert: boolean }

// Ergebnis eines Angebots aus der Treffer-Episode, zu der es gehört. Archivierte Treffer
// verlieren ihre match_id in nachrichten (on delete set null); dann zählt die Episode
// desselben Paars, die beim Versand bestand -- nicht ein späteres Rematching (R7).
export function angebotErgebnis(roh: Pick<RapportRohdaten, "treffer" | "trefferArchiv">): (angebot: RohAngebot) => string {
  const status = new Map(roh.treffer.map((t) => [t.id, t.status]))
  const episoden = new Map<string, Episode[]>()
  const merke = (schluessel: string, e: Episode) => episoden.set(schluessel, [...(episoden.get(schluessel) ?? []), e])
  for (const t of roh.treffer) merke(paarSchluessel(t.anfrage_id, t.objekt_id), { status: t.status, ab: t.created_at, bis: null, archiviert: false })
  for (const t of roh.trefferArchiv) {
    merke(paarSchluessel(t.anfrage_id, t.objekt_id), { status: t.status, ab: t.treffer_erstellt_am, bis: t.archiviert_am, archiviert: true })
  }
  return (angebot) => {
    const direkt = angebot.match_id ? status.get(angebot.match_id) : undefined
    if (direkt) return ANGEBOT_ERGEBNIS[direkt]
    const gesendet = Date.parse(angebot.gesendet_am ?? "")
    const episode = (episoden.get(paarSchluessel(angebot.anfrage_id, angebot.objekt_id)) ?? []).find(
      (e) => Date.parse(e.ab) <= gesendet && (e.bis === null || gesendet <= Date.parse(e.bis))
    )
    if (!episode) return "angeboten"
    return episode.archiviert ? "archiviert" : ANGEBOT_ERGEBNIS[episode.status]
  }
}

export function baueTabellen(a: RapportAuswahl, roh: RapportRohdaten, n: Nachschlagen): RapportModell["tabellen"] {
  const titel = (objektId: string | null) => n.objekt(objektId)?.titel ?? null
  const ergebnis = angebotErgebnis(roh)
  const angeboteJeObjekt = new Map<string, number>()
  for (const x of a.angebote) if (x.objekt_id) angeboteJeObjekt.set(x.objekt_id, (angeboteJeObjekt.get(x.objekt_id) ?? 0) + 1)

  return {
    vermittlungen: tabelle(
      "Vermittlungen",
      [["datum", "Datum", "datum"], ["firma", "Firma", "text"], ["objekt", "Objekt", "text"], ["flaeche", "Fläche m²", "zahl"], ["preisProM2", "Preis/m²", "chf"], ["tageBisAbschluss", "Tage bis Abschluss", "zahl"]],
      a.vermittlungen.map((v) => {
        const objekt = n.objekt(v.objektId)
        const erstellt = n.anfrage(v.anfrageId)?.created_at
        return {
          datum: datum(v.abgeschlossenAm), firma: n.firma(v.anfrageId), objekt: objekt?.titel ?? null,
          flaeche: objekt?.flaeche ?? null, preisProM2: objekt?.preis_pro_m2 ?? null,
          tageBisAbschluss: erstellt ? tageZwischen(erstellt, v.abgeschlossenAm) : null,
        }
      })
    ),
    angebote: tabelle(
      "Angebote",
      [["gesendet", "Gesendet", "datum"], ["firma", "Firma", "text"], ["objekt", "Objekt", "text"], ["ergebnis", "Ergebnis", "text"]],
      a.angebote.map((x) => ({ gesendet: datum(x.gesendet_am), firma: n.firma(x.anfrage_id), objekt: titel(x.objekt_id), ergebnis: ergebnis(x) }))
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
