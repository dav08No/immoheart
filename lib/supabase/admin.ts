import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Umgeht RLS vollständig. Nur in Server Actions / Route Handlers verwenden, die
// vorher selbst geprüft haben, wer aufruft.
export function erstelleAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
