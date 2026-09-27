import "server-only"
import { ImapFlow } from "imapflow"
import { simpleParser } from "mailparser"
import {
  anhangErlaubt,
  duplikatNeuImportieren,
  eingangFelderAusMail,
  sichererDateiname,
  zeitFuerWeitereMail,
} from "@/lib/mail/eingang"
import { abrufSeit, ersatzMessageId, waehleZuImportieren, type Kandidat } from "@/lib/mail/auswahl"
import {
  gibEingangFrei,
  holeBekannteMessageIds,
  speichereAnhang,
  speichereEingang,
  verwerfeEingang,
} from "@/lib/queries/eingang-import"

const IMAP_HOST = "imap.gmail.com"
const IMAP_PORT = 993
// Deutlich unter den ImapFlow-Standardwerten (u.a. 5 Minuten Socket-Timeout): eine
// hängende oder extrem langsame Gmail-Verbindung darf nicht das gesamte 60-Sekunden-
// Budget der Server-Funktion aufbrauchen -- lieber mit einem klaren Fehler abbrechen,
// der über abrufFehler sichtbar wird, und beim nächsten Abruf erneut versuchen.
const VERBINDUNGS_TIMEOUT_MS = 10_000
const SOCKET_TIMEOUT_MS = 20_000

type ErlaubterAnhang = { dateiname: string; mime: string; inhalt: Buffer; index: number }
type MailErgebnis = "gespeichert" | "duplikat" | "uebersprungen"

// Nur noch Anzeige in Gmail ("schon in immoheart"); ob eine Mail neu ist, entscheidet
// die Message-ID (lib/mail/auswahl.ts).
async function markiereGelesen(client: ImapFlow, uid: number): Promise<void> {
  await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true })
}

async function speichereAnhaengeOderVerwirf(id: string, anhaenge: ErlaubterAnhang[]): Promise<void> {
  try {
    for (const anhang of anhaenge) await speichereAnhang(id, anhang)
  } catch (fehler) {
    // Zeile + schon hochgeladene Anhänge wieder entfernen: ohne Zeile ist die
    // Message-ID unbekannt, der nächste Abruf holt die Mail komplett neu. Ein Fehler beim Aufräumen wird nur
    // geloggt (die Zeile bleibt dann mit ki_status null stehen und wird beim nächsten
    // Abruf über duplikatNeuImportieren verworfen); geworfen wird der Ursprungsfehler.
    try {
      await verwerfeEingang(id)
    } catch (aufraeumFehler) {
      console.error("holeNeueMails: Aufräumen fehlgeschlagen", id, aufraeumFehler)
    }
    throw fehler
  }
}

async function importiereMail(client: ImapFlow, { uid, messageId }: Kandidat): Promise<MailErgebnis> {
  const nachricht = await client.fetchOne(uid, { source: true }, { uid: true })
  if (!nachricht || !nachricht.source) {
    console.error("holeNeueMails: keine Rohquelle für UID", uid)
    return "uebersprungen"
  }
  const parsed = await simpleParser(nachricht.source)
  const felder = eingangFelderAusMail(parsed)

  // Erst einordnen (erlaubt/nicht erlaubt), dann speichern -- unerlaubte Anhänge landen
  // nur als Name im anhaenge-Feld (globale Vorgabe: "Andere Dateien: nur der Name").
  const erlaubteAnhaenge: ErlaubterAnhang[] = []
  const anhaengeNamen: string[] = []
  parsed.attachments.forEach((anhang, index) => {
    const dateiname = sichererDateiname(anhang.filename, index)
    if (anhangErlaubt(anhang.contentType, anhang.size)) {
      erlaubteAnhaenge.push({ dateiname, mime: anhang.contentType, inhalt: anhang.content, index })
    } else {
      anhaengeNamen.push(dateiname)
    }
  })

  // Dieselbe ID wie bei der Auswahl, sonst griffe die Doppel-Erkennung nicht.
  const eintrag = { ...felder, message_id: messageId, anhaenge: anhaengeNamen }
  let zeile = await speichereEingang(eintrag)
  if ("duplikat" in zeile) {
    if (!duplikatNeuImportieren(zeile.duplikat)) {
      // Zwischen Auswahl und Speichern von einem anderen Abruf importiert.
      await markiereGelesen(client, uid)
      return "duplikat"
    }
    // Abgebrochener Import (Final-Review I3): verwerfen und gleich neu speichern.
    await verwerfeEingang(zeile.duplikat.id)
    zeile = await speichereEingang(eintrag)
    if ("duplikat" in zeile) throw new Error("Eingang nach dem Verwerfen erneut vorhanden")
  }

  await speichereAnhaengeOderVerwirf(zeile.id, erlaubteAnhaenge)
  // Erst jetzt für die KI freigeben und danach als gelesen markieren (globale Vorgabe:
  // Rohtext + Anhänge zuerst) -- scheitert einer der Schritte, bleibt die Zeile mit
  // ki_status null und wird beim nächsten Abruf verworfen und neu importiert.
  await gibEingangFrei(zeile.id)
  await markiereGelesen(client, uid)
  return "gespeichert"
}

// Nur die Umschläge laden (klein): welche Mail neu ist, entscheidet die Message-ID.
async function holeKandidaten(client: ImapFlow): Promise<Kandidat[]> {
  const gefunden = await client.search({ since: abrufSeit(Date.now()) }, { uid: true })
  const uids = Array.isArray(gefunden) ? gefunden : []
  if (uids.length === 0) return []
  const uidValidity = client.mailbox ? String(client.mailbox.uidValidity) : "0"
  // imapflow liefert eine fehlende Message-ID als "" statt undefined, daher || statt ??.
  const umschlaege = await client.fetchAll(uids, { envelope: true }, { uid: true })
  return umschlaege.map((m) => ({ uid: m.uid, messageId: m.envelope?.messageId || ersatzMessageId(uidValidity, m.uid) }))
}

export async function holeNeueMails(max: number): Promise<{ gespeichert: number; duplikate: number }> {
  const start = Date.now()
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env
  // Ohne beide Werte würde ImapFlow erst beim Verbindungsaufbau scheitern -- mit einer
  // verwirrenden Fehlermeldung statt einer klaren Konfigurationsursache (gleiches
  // Muster wie sendeMail, lib/mail/versand.ts).
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) throw new Error("GMAIL_USER oder GMAIL_APP_PASSWORD fehlt")

  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    logger: false,
    connectionTimeout: VERBINDUNGS_TIMEOUT_MS,
    greetingTimeout: VERBINDUNGS_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
  })

  let gespeichert = 0
  let duplikate = 0

  await client.connect()
  try {
    const lock = await client.getMailboxLock("INBOX")
    try {
      const kandidaten = await holeKandidaten(client)
      const bekannt = await holeBekannteMessageIds(kandidaten.map((k) => k.messageId))
      const auswahl = waehleZuImportieren(kandidaten, bekannt, max)

      for (const kandidat of auswahl) {
        const { uid } = kandidat
        if (!zeitFuerWeitereMail(start, Date.now())) break
        try {
          const ergebnis = await importiereMail(client, kandidat)
          if (ergebnis === "gespeichert") gespeichert++
          if (ergebnis === "duplikat") duplikate++
        } catch (fehler) {
          // Einzelne kaputte Mail darf den ganzen Abruf nicht abbrechen -- loggen und mit
          // der nächsten weitermachen; sie wird beim nächsten Abruf erneut versucht.
          console.error("holeNeueMails: Mail konnte nicht verarbeitet werden, UID", uid, fehler)
        }
      }
    } finally {
      lock.release()
    }
  } finally {
    try {
      await client.logout()
    } catch (fehler) {
      console.error("holeNeueMails: logout fehlgeschlagen", fehler)
    }
  }

  return { gespeichert, duplikate }
}
