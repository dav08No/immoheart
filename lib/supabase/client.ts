import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"

export function erstelleBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
