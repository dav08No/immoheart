import { NextResponse, type NextRequest } from "next/server"
import { erstelleServerClient } from "@/lib/supabase/server"
import { LOGIN_PFAD } from "@/lib/routen"

async function abmelden(request: NextRequest): Promise<NextResponse> {
  const supabase = await erstelleServerClient()
  await supabase.auth.signOut()
  // 303, damit ein POST aus dem Abmelden-Formular als GET auf /login weitergeht.
  return NextResponse.redirect(new URL(LOGIN_PFAD, request.url), 303)
}

export const GET = abmelden
export const POST = abmelden
