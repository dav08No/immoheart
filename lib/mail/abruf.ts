import "server-only"
import { ImapFlow } from "imapflow"
import { simpleParser } from "mailparser"
import { anhangErlaubt, eingangFelderAusMail, sichererDateiname } from "@/lib/mail/eingang"
import { speichereAnhang, speichereEingang } from "@/lib/queries/eingang"

const IMAP_HOST = "imap.gmail.com"
const IMAP_PORT = 993
// Deutlich unter den ImapFlow-Standardwerten (u.a. 5 Minuten Socket-Timeout): eine
// hängende oder extrem langsame Gmail-Verbindung darf nicht das gesamte 60-Sekunden-
// Budget der Server-Funktion aufbrauchen -- lieber mit einem klaren Fehler abbrechen,
// der über abrufFehler sichtbar wird, und beim nächsten Abruf erneut versuchen.
const VERBINDUNGS_TIMEOUT_MS = 10_000
const SOCKET_TIMEOUT_MS = 20_000

type ErlaubterAnhang = { dateiname: string; mime: string; inhalt: Buffer; index: number }

export async function holeNeueMails(max: number): Promise<{ gespeichert: number; duplikate: number }> {
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
      const gefunden = await client.search({ seen: false }, { uid: true })
      const uids = (Array.isArray(gefunden) ? gefunden : []).slice().sort((a, b) => a - b).slice(0, max)

      for (const uid of uids) {
        try {
          const nachricht = await client.fetchOne(uid, { source: true }, { uid: true })
          if (!nachricht || !nachricht.source) {
            console.error("holeNeueMails: keine Rohquelle für UID", uid)
            continue
          }
          const parsed = await simpleParser(nachricht.source)
          const felder = eingangFelderAusMail(parsed)

          // Erst einordnen (erlaubt/nicht erlaubt), dann speichern -- unerlaubte
          // Anhänge landen nur als Name im anhaenge-Feld der Nachricht selbst
          // (globale Vorgabe: "Andere Dateien: nur der Name").
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

          const zeile = await speichereEingang({ ...felder, anhaenge: anhaengeNamen })
          if (!zeile) {
            // Duplikat (message_id bereits vorhanden): trotzdem als gelesen markieren,
            // damit ein früher schon verarbeiteter Eingang nicht bei jedem Abruf erneut
            // als "neu" auftaucht.
            duplikate++
            await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true })
            continue
          }

          for (const anhang of erlaubteAnhaenge) {
            await speichereAnhang(zeile.id, anhang)
          }

          // Erst NACH Rohtext + Anhängen als gelesen markieren (globale Vorgabe): schlägt
          // einer der beiden Schritte fehl, bleibt die Mail ungelesen und wird beim
          // nächsten Abruf erneut versucht.
          await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true })
          gespeichert++
        } catch (fehler) {
          // Einzelne kaputte Mail darf den ganzen Abruf nicht abbrechen -- loggen, nicht
          // als gelesen markieren, mit der nächsten UID weitermachen.
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
