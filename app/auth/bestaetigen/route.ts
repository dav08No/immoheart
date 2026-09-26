import { NextResponse, type NextRequest } from "next/server"
import { erstelleServerClient } from "@/lib/supabase/server"
import { LOGIN_PFAD, PASSWORT_SETZEN_PFAD, linkTyp } from "@/lib/routen"

// Löst den Token aus Einladungs- oder Reset-Mail ein. verifyOtp setzt die
// Session-Cookies, danach legt der Nutzer auf /passwort-setzen sein Passwort fest.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get("token_hash")
  const typ = linkTyp(url.searchParams.get("typ"))
  if (!tokenHash || !typ) {
    return NextResponse.redirect(new URL(`${LOGIN_PFAD}?grund=link-ungueltig`, request.url), 303)
  }

  const supabase = await erstelleServerClient()
  const { error } = await supabase.auth.verifyOtp({ type: typ, token_hash: tokenHash })
  if (error) {
    return NextResponse.redirect(new URL(`${LOGIN_PFAD}?grund=link-ungueltig`, request.url), 303)
  }
  return NextResponse.redirect(new URL(PASSWORT_SETZEN_PFAD, request.url), 303)
}
