export const ADMIN_START = "/admin"
export const LOGIN_PFAD = "/login"

// Exakter Segmentvergleich statt startsWith("/admin"): sonst würde "/administration"
// als geschützt gelten und umgekehrt könnte ein Präfix-Fehler eine Admin-Route
// durchlassen. Kleinschreibung, weil Next.js-Routen auf Vercel sonst je nach
// Schreibweise unterschiedlich behandelt werden könnten.
export function istAdminPfad(pfad: string): boolean {
  const klein = pfad.toLowerCase()
  return klein === ADMIN_START || klein.startsWith(`${ADMIN_START}/`)
}

// Exakter Vergleich statt z. B. case-insensitiv oder trim: `grund` kommt aus einem
// öffentlichen Query-Parameter (/abmelden?grund=...) und wird ungeprüft in eine
// Redirect-URL übernommen. Ein exakter Whitelist-Vergleich verhindert, dass
// beliebiger Text (z. B. "<script>") auf /login reflektiert wird.
export function loginZielNachAbmelden(grund: string | null): string {
  return grund === "inaktiv" ? `${LOGIN_PFAD}?grund=inaktiv` : LOGIN_PFAD
}

export const PASSWORT_SETZEN_PFAD = "/passwort-setzen"

export type LinkTyp = "invite" | "recovery"

export function linkTyp(wert: string | null): LinkTyp | null {
  return wert === "invite" || wert === "recovery" ? wert : null
}

// Feste Texte statt Query-Inhalt: /login zeigt nie, was in der URL steht.
// Object.hasOwn statt `in`, damit "toString" & Co. nicht als Schlüssel gelten.
export const LOGIN_HINWEISE: Record<string, string> = {
  inaktiv: "Dieses Konto ist deaktiviert.",
  "link-ungueltig": "Der Link ist ungültig oder abgelaufen.",
}

export function loginHinweis(grund: string | null): string | null {
  if (grund === null || !Object.hasOwn(LOGIN_HINWEISE, grund)) return null
  return LOGIN_HINWEISE[grund] ?? null
}

// Schutz gegen Cross-Site-Einlösen: ein POST auf /auth/bestaetigen/einloesen von
// einer fremden Seite (z. B. eingebettetes Formular, das die Session eines
// eingeloggten Nutzers ersetzt) hätte trotz gültigem Token keinen passenden
// Origin-Header. Fehlt der Header oder ist er keine gültige URL, wird das als
// Fremd-Ursprung gewertet (fail closed), nicht als Ausnahme.
export function istGleicherUrsprung(origin: string | null, anfrageUrl: string): boolean {
  if (origin === null) return false
  try {
    return new URL(origin).host === new URL(anfrageUrl).host
  } catch {
    return false
  }
}
