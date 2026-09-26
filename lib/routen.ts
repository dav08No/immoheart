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
