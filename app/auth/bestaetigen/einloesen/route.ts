import { NextResponse, type NextRequest } from "next/server"
import { erstelleServerClient } from "@/lib/supabase/server"
import { LOGIN_PFAD, PASSWORT_SETZEN_PFAD, istGleicherUrsprung, linkTyp } from "@/lib/routen"

// Löst den Token aus Einladungs- oder Reset-Mail ein. Nur per POST (nicht GET):
// Mail-Scanner/Prefetcher rufen Links aus E-Mails oft unaufgefordert per GET ab
// und würden ein Einmal-Token verbrauchen, bevor der Nutzer klickt; ein GET
// würde ausserdem als Login-CSRF missbraucht werden können (ein eingebetteter
// Link ersetzt still die Session eines bereits eingeloggten Nutzers). Zusätzlich
// wird der Origin-Header geprüft, damit das Formular nicht von einer fremden
// Seite aus abgeschickt werden kann. verifyOtp setzt danach die
// Session-Cookies, der Nutzer legt anschliessend auf /passwort-setzen sein
// Passwort fest.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const ungueltig = NextResponse.redirect(new URL(`${LOGIN_PFAD}?grund=link-ungueltig`, request.url), 303)

  const origin = request.headers.get("origin")
  if (!istGleicherUrsprung(origin, request.url)) {
    return ungueltig
  }

  const formData = await request.formData()
  const tokenHashRoh = formData.get("token_hash")
  const typRoh = formData.get("typ")
  const tokenHash = typeof tokenHashRoh === "string" ? tokenHashRoh : null
  const typ = linkTyp(typeof typRoh === "string" ? typRoh : null)
  if (!tokenHash || !typ) {
    return ungueltig
  }

  const supabase = await erstelleServerClient()
  const { error } = await supabase.auth.verifyOtp({ type: typ, token_hash: tokenHash })
  if (error) {
    return ungueltig
  }
  return NextResponse.redirect(new URL(PASSWORT_SETZEN_PFAD, request.url), 303)
}
