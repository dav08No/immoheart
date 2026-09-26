import { NextResponse, type NextRequest } from "next/server"
import { erstelleServerClient } from "@/lib/supabase/server"
import { loginZielNachAbmelden } from "@/lib/routen"

async function abmelden(request: NextRequest): Promise<NextResponse> {
  const supabase = await erstelleServerClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    // Der serverseitige Widerruf ist fehlgeschlagen (z. B. Netzwerkfehler). Ohne
    // weiteres Handeln behält auth-js die lokale Session -> /admin -> /abmelden
    // -> /login -> Middleware -> /admin, eine Endlosschleife. scope: "local"
    // löscht nur die lokalen Session-Cookies, ohne nochmals den Server zu rufen.
    console.error("Abmelden: signOut() fehlgeschlagen, erzwinge lokales Abmelden", error)
    await supabase.auth.signOut({ scope: "local" })
  }
  // grund wird nur exakt "inaktiv" durchgereicht (siehe loginZielNachAbmelden) --
  // niemals wird beliebiger Query-Input auf /login reflektiert.
  const grund = new URL(request.url).searchParams.get("grund")
  // 303, damit ein POST aus dem Abmelden-Formular als GET auf /login weitergeht.
  return NextResponse.redirect(new URL(loginZielNachAbmelden(grund), request.url), 303)
}

export const GET = abmelden
export const POST = abmelden
