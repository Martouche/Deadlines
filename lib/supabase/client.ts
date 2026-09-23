import { createBrowserClient } from "@supabase/ssr"

import { env } from "@/lib/env"

/** Client Supabase navigateur (Realtime, upload de fichiers). */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey)
}
