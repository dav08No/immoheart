import type { Database } from "@/types/database"

// Reine Zeit-Entscheidung, losgelöst von der DB-Abfrage (lib/queries/nachrichten.ts) und
// der UI (EntwurfEditor): eine Reservierung (gesendet_am gesetzt, richtung noch "entwurf")
// gilt erst nach RESERVIERUNG_TIMEOUT_MS als festsitzend. Vorher könnte entwurfSenden noch
// mitten im SMTP-Versand stecken -- ein verfrühtes Freigeben würde einen zweiten Versand
// derselben Mail erlauben.
export const RESERVIERUNG_TIMEOUT_MS = 2 * 60 * 1000

export function istReservierungAbgelaufen(gesendetAm: string, jetzt: Date): boolean {
  return jetzt.getTime() - new Date(gesendetAm).getTime() >= RESERVIERUNG_TIMEOUT_MS
}

type Enums = Database["public"]["Enums"]

export const ANGEBOT_GESPERRT =
  "Das Objekt dieses Angebots ist nicht mehr verfügbar oder der Treffer ist abgeschlossen – Entwurf löschen."
export const ABSAGE_GESPERRT =
  "Der Treffer zu dieser Absage ist wieder offen (Objekt wieder verfügbar) – Entwurf löschen."

export type EntwurfSperre = { chip: string; meldung: string }

// Sendesperre für veraltete Entwürfe. Angebot: nur solange der Treffer offen (neu/gesendet)
// und das Objekt verfügbar ist -- sonst böte es ein vergebenes Objekt an (match_id null heisst
// Treffer gelöscht, ON DELETE SET NULL). Absage (Ruling R17): nur solange der Treffer
// 'erledigt' ist -- nach "wieder verfügbar" (I5) würde sie "vermietet" melden, während wir
// das Objekt erneut anbieten.
export function entwurfGesperrt(
  entwurf: { typ: string; match_id: string | null },
  matchStatus: Enums["match_status_enum"] | null,
  objektStatus: Enums["objekt_status_enum"] | null
): EntwurfSperre | null {
  if (entwurf.typ === "angebot") {
    const offen = !!entwurf.match_id && (matchStatus === "neu" || matchStatus === "gesendet") && objektStatus === "verfuegbar"
    return offen ? null : { chip: "Angebot entfallen", meldung: ANGEBOT_GESPERRT }
  }
  if (entwurf.typ === "absage" && entwurf.match_id && matchStatus !== "erledigt") {
    return { chip: "Absage entfallen", meldung: ABSAGE_GESPERRT }
  }
  return null
}
