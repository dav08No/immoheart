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
