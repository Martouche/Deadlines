import "server-only"
import type { PostgrestError } from "@supabase/supabase-js"

import { describeError, logEvent, newRef } from "@/lib/logger"

/**
 * Lecture côté Server Component : journalise et lève une erreur explicite si la
 * requête échoue (au lieu d'afficher silencieusement une page vide).
 * L'erreur est rattrapée par error.tsx, qui affiche la référence.
 */
export async function read<T>(label: string, query: PromiseLike<{ data: T; error: PostgrestError | null }>): Promise<T> {
  const { data, error } = await query
  if (error) {
    const ref = newRef()
    await logEvent({ level: "error", action: `read:${label}`, ref, error: describeError(error) })
    throw new Error(`Chargement impossible (${label}) : ${error.message} — réf. ${ref}`)
  }
  return data
}
