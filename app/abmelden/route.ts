import { NextResponse, type NextRequest } from "next/server"
import { erstelleServerClient } from "@/lib/supabase/server"
import { ADMIN_START, istGleicherUrsprung, loginZielNachAbmelden } from "@/lib/routen"

type ServerClient = Awaited<ReturnType<typeof erstelleServerClient>>

async function abmelden(request: NextRequest, supabase: ServerClient): Promise<NextResponse> {
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

// Abmelde-Knöpfe (Sidebar, Fehlerseite) schicken ein Formular per POST. Ohne
// Origin-Prüfung könnte eine fremde Seite das Formular nachbauen und abmelden.
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!istGleicherUrsprung(request.headers.get("origin"), request.url)) {
    return NextResponse.redirect(new URL(ADMIN_START, request.url), 303)
  }
  return abmelden(request, await erstelleServerClient())
}

// GET nur für den Redirect aus holeEigenesProfil (/abmelden?grund=inaktiv). Ein
// eingebettetes <img src="/abmelden"> von einer fremden Seite darf eine aktive
// Sitzung nicht beenden: abgemeldet wird nur, wer kein aktives Profil hat (RLS
// liefert die eigene Zeile nur bei aktivem Konto).
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await erstelleServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const { data } = await supabase.from("profiles").select("aktiv").eq("user_id", user.id).maybeSingle()
    if (data?.aktiv === true) return NextResponse.redirect(new URL(ADMIN_START, request.url), 303)
  }
  return abmelden(request, supabase)
}
