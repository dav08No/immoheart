import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

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

  // Exakter Vergleich, kein startsWith: bei einem Präfix-Vergleich würde ein
  // künftiger Pfad wie "/login-hilfe" fälschlich als "schon auf einer
  // Auth-Seite" gelten und die Middleware nicht mehr davor schützen --
  // gefunden bei der finalen Milestone-Review (live bestätigt: GET /loginX
  // lieferte 404 statt eines 307-Redirects, weil die Middleware es
  // durchliess). Gilt genauso für "/register" -- .includes() auf einer
  // festen Liste vollständiger Pfade, nie ein Präfix-Check.
  const AUTH_SEITEN = ["/login", "/register"]
  const istAuthSeite = AUTH_SEITEN.includes(request.nextUrl.pathname)

  // NextResponse.redirect(...) baut ein komplett neues Response-Objekt --
  // ohne diesen Schritt gehen alle Cookies, die setAll oben eventuell schon
  // auf `response` geschrieben hat (Token-Refresh, Session-Cleanup nach
  // abgelaufenem Login), auf jedem der beiden Redirect-Pfade verloren. Der
  // Browser würde dann bei jeder weiteren Anfrage erneut mit dem alten,
  // bereits ungültigen Refresh-Token starten. Betrifft auch Supabase's
  // eigenes offizielles Middleware-Beispiel, das denselben Fehler hat.
  function mitAktualisiertenCookies(ziel: NextResponse): NextResponse {
    for (const cookie of response.cookies.getAll()) {
      ziel.cookies.set(cookie)
    }
    return ziel
  }

  if (!user && !istAuthSeite) {
    return mitAktualisiertenCookies(NextResponse.redirect(new URL("/login", request.url)))
  }
  if (user && istAuthSeite) {
    return mitAktualisiertenCookies(NextResponse.redirect(new URL("/", request.url)))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
