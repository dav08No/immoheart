// Reine Helfer ohne I/O oder server-only-Import: der IMAP-Fetcher (Task 3)
// ruft diese Funktionen auf, muss dafür aber selbst nicht importierbar sein --
// nur so bleibt diese Datei ohne echte Mailbox unit-testbar.

const SCRIPT_STYLE_REGEX = /<(script|style)[^>]*>[\s\S]*?<\/\1>/gi
// Fehlt die schliessende Tag (kaputtes/abgeschnittenes HTML), würde der Inhalt
// ohne diese Regel als Text durchrutschen -- Script-/Style-Inhalt darf aber
// nie im extrahierten Text landen, auch nicht bei fehlendem Ende.
const UNGESCHLOSSENES_SCRIPT_STYLE_REGEX = /<(script|style)[^>]*>[\s\S]*$/i
const ZEILENUMBRUCH_TAGS_REGEX = /<br\s*\/?>|<\/(p|div|li)>/gi
const VERBLEIBENDE_TAGS_REGEX = /<[^>]+>/g

function entferneScriptUndStyle(html: string): string {
  return html.replace(SCRIPT_STYLE_REGEX, "").replace(UNGESCHLOSSENES_SCRIPT_STYLE_REGEX, "")
}

export function htmlZuText(html: string): string {
  const ohneScriptStyle = entferneScriptUndStyle(html)
  const mitZeilenumbruechen = ohneScriptStyle.replace(ZEILENUMBRUCH_TAGS_REGEX, "\n")
  const ohneTags = mitZeilenumbruechen.replace(VERBLEIBENDE_TAGS_REGEX, "")
  const dekodiert = ohneTags
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
  return dekodiert.replace(/\n{3,}/g, "\n\n").trim()
}

// Deckt sich exakt mit den allowed_mime_types des Storage-Buckets.
export const ERLAUBTE_ANHANG_TYPEN: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]
export const MAX_ANHANG_BYTES = 10 * 1024 * 1024

export function anhangErlaubt(mime: string, groesse: number): boolean {
  return ERLAUBTE_ANHANG_TYPEN.includes(mime.toLowerCase()) && groesse <= MAX_ANHANG_BYTES
}

const UNERLAUBTE_ZEICHEN_REGEX = /[^a-zA-Z0-9._-]/g
const MAX_DATEINAME_LAENGE = 80

export function sichererDateiname(name: string | undefined, index: number): string {
  if (!name || name.trim().length === 0) return `anhang-${index}`
  const bereinigt = name.replace(UNERLAUBTE_ZEICHEN_REGEX, "_")
  // "." oder ".." wären als Dateiname das aktuelle bzw. übergeordnete
  // Verzeichnis -- nach der Bereinigung nur noch Punkte ist kein brauchbarer
  // Dateiname.
  if (/^\.+$/.test(bereinigt)) return `anhang-${index}`
  if (bereinigt.length <= MAX_DATEINAME_LAENGE) return bereinigt
  const punkt = bereinigt.lastIndexOf(".")
  const endung = punkt > 0 ? bereinigt.slice(punkt) : ""
  const basis = punkt > 0 ? bereinigt.slice(0, punkt) : bereinigt
  return basis.slice(0, Math.max(MAX_DATEINAME_LAENGE - endung.length, 0)) + endung
}

const MESSAGE_ID_REGEX = /<[^<>]+>/g

export function referenzListe(inReplyTo: string | undefined, references: string | string[] | undefined): string[] {
  const inReplyToIds = inReplyTo?.match(MESSAGE_ID_REGEX) ?? []
  const referencesText = Array.isArray(references) ? references.join(" ") : (references ?? "")
  const referencesIds = referencesText.match(MESSAGE_ID_REGEX) ?? []
  return Array.from(new Set([...inReplyToIds, ...referencesIds]))
}

export function absender(
  from: { value: { address?: string; name?: string }[] } | undefined
): { adresse: string; name: string | null } | null {
  const erste = from?.value?.[0]
  if (!erste?.address) return null
  return { adresse: erste.address.toLowerCase(), name: erste.name?.trim() || null }
}

// Eigene, minimale Sicht auf ein von mailparser geparstes Mail-Objekt statt des
// Pakets selbst zu importieren (wie schon bei absender oben) -- so bleibt diese
// Datei ohne server-only-Abhängigkeit unit-testbar; ParsedMail von mailparser
// erfüllt diese Form strukturell, holeNeueMails (Task 3) kann sie direkt übergeben.
export type GeparsteMail = {
  messageId?: string | undefined
  inReplyTo?: string | undefined
  references?: string | string[] | undefined
  from?: { value: { address?: string; name?: string }[] } | undefined
  subject?: string | undefined
  text?: string | undefined
  html?: string | false | undefined
  date?: Date | undefined
}

export type EingangFelder = {
  message_id: string | null
  in_reply_to: string | null
  referenzen: string | null
  von: string
  betreff: string
  body: string
  empfangen_am: string | null
}

const MAX_BODY_ZEICHEN = 50_000

// Bildet die reine Zuordnungslogik ab, die aus einer geparsten Mail die an
// speichereEingang übergebenen Felder macht -- ausgelagert aus holeNeueMails
// (lib/mail/abruf.ts, server-only, ohne echte Mailbox nicht testbar), damit diese
// nicht ganz triviale Zuordnung (Text/HTML-Fallback, Kürzung, Referenz-Extraktion,
// Absender-/Betreff-Fallback) eigene Tests bekommt.
export function eingangFelderAusMail(mail: GeparsteMail): EingangFelder {
  const abs = absender(mail.from)
  const rohtext = mail.text ?? htmlZuText(mail.html || "")
  const referenzen = referenzListe(mail.inReplyTo, mail.references)
  const inReplyToId = mail.inReplyTo?.match(MESSAGE_ID_REGEX)?.[0] ?? null
  return {
    message_id: mail.messageId ?? null,
    in_reply_to: inReplyToId,
    referenzen: referenzen.length > 0 ? referenzen.join(" ") : null,
    von: abs?.adresse ?? "unbekannt",
    betreff: mail.subject?.trim() || "(ohne Betreff)",
    body: rohtext.length > MAX_BODY_ZEICHEN ? rohtext.slice(0, MAX_BODY_ZEICHEN) : rohtext,
    empfangen_am: mail.date ? mail.date.toISOString() : null,
  }
}

// Nach ~30 s keine weitere Mail mehr anfangen: eine angefangene Mail (Download, Anhänge)
// braucht Zeit, und die Server Action wird nach 60 s beendet (Final-Review I3). Die
// übrigen Mails bleiben ungelesen und kommen im nächsten Abruf dran.
export const ABRUF_ZEITBUDGET_MS = 30_000

export function zeitFuerWeitereMail(startMs: number, jetztMs: number): boolean {
  return jetztMs - startMs < ABRUF_ZEITBUDGET_MS
}

export type BestehenderEingang = { id: string; richtung: string; ki_status: string | null }

// Ein Eingang mit ki_status null ist ein Import, der vor gibEingangFrei abgebrochen ist
// (z.B. Funktion während der Anhänge beendet): verwerfen und neu importieren, statt ihn
// mit fehlenden Anhängen als Duplikat zu akzeptieren. Alles andere ist vollständig.
export function duplikatNeuImportieren(bestehend: BestehenderEingang | null): bestehend is BestehenderEingang {
  return bestehend !== null && bestehend.richtung === "eingang" && bestehend.ki_status === null
}
