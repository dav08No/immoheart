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
