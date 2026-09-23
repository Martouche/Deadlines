import "server-only"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { env } from "@/lib/env"

/**
 * Client Supabase côté serveur (Server Components, Server Actions, Route Handlers).
 * Agit avec la session de l'utilisateur : la RLS s'applique.
 * À recréer à chaque requête.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Appelé depuis un Server Component : les cookies sont en lecture seule.
          // Sans risque, le proxy rafraîchit la session à chaque requête.
        }
      },
    },
  })
}
