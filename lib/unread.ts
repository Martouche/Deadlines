import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

import { describeError, logEvent, newRef } from "@/lib/logger"

/**
 * Dernière ouverture de chaque tâche par l'utilisateur courant (RLS : ses lignes uniquement).
 * Si la table manque (migration non appliquée), on continue sans badge plutôt que de casser la page.
 */
export async function getLastReads(supabase: SupabaseClient, taskIds: string[]): Promise<Map<string, string>> {
  if (taskIds.length === 0) return new Map()
  const { data, error } = await supabase.from("task_reads").select("task_id, last_read_at").in("task_id", taskIds)
  if (error) {
    await logEvent({ level: "warn", action: "read:task_reads", ref: newRef(), error: describeError(error) })
    return new Map()
  }
  return new Map(data.map((r) => [r.task_id as string, r.last_read_at as string]))
}

/** Commentaires des autres postés depuis la dernière lecture. */
export function countUnread(
  comments: { created_at: string; author_id: string }[],
  lastRead: string | undefined,
  userId: string,
) {
  return comments.filter((c) => c.author_id !== userId && (!lastRead || c.created_at > lastRead)).length
}
