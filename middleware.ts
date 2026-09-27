import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { ADMIN_START, LOGIN_PFAD, istAdminPfad } from "@/lib/routen"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pfad = request.nextUrl.pathname

  // NextResponse.redirect baut ein neues Response-Objekt; ohne Übernahme gingen
  // von setAll erneuerte Session-Cookies auf den Redirect-Pfaden verloren.
  function mitAktualisiertenCookies(ziel: NextResponse): NextResponse {
    for (const cookie of response.cookies.getAll()) ziel.cookies.set(cookie)
    return ziel
  }

  if (!user && istAdminPfad(pfad)) {
    return mitAktualisiertenCookies(NextResponse.redirect(new URL(LOGIN_PFAD, request.url)))
  }
  if (user && pfad === LOGIN_PFAD) {
    return mitAktualisiertenCookies(NextResponse.redirect(new URL(ADMIN_START, request.url)))
  }

  return response
}

// Öffentliche Seiten brauchen keine Session -- die Middleware läuft nur dort,
// wo Login-Zustand eine Rolle spielt. "/admin/:path*" deckt auch "/admin" ab.
// /passwort-setzen läuft ebenfalls durch die Middleware (Session-Refresh),
// wird aber weder geschützt noch umgeleitet: istAdminPfad ist dort false und
// der Pfad ist nicht "/login".
export const config = {
  matcher: ["/admin/:path*", "/login", "/passwort-setzen"],
}
