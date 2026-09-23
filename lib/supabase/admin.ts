import "server-only"
import { createClient } from "@supabase/supabase-js"

import { env } from "@/lib/env"

/**
 * Client « service role » : contourne la RLS. Réservé aux opérations Auth
 * d'administration (invitation d'utilisateurs). Ne jamais l'utiliser pour lire
 * ou écrire des données métier.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createClient(env.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
