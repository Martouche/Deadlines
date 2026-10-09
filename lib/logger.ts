import "server-only"
import { after } from "next/server"

import { createClient } from "@/lib/supabase/server"

export type LogLevel = "info" | "warn" | "error"

export type LogEntry = {
  level: LogLevel
  action: string
  ref: string
  durationMs?: number
  context?: Record<string, unknown>
  error?: string
}

/** Référence courte, affichée à l'utilisateur et stockée dans le log. */
export function newRef() {
  return crypto.randomUUID().slice(0, 8)
}

/** Sérialise une erreur quelconque (Error, PostgrestError, AuthError…) en texte lisible. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const extra = ["code", "status", "details", "hint"]
      .map((k) => (error as unknown as Record<string, unknown>)[k])
      .filter(Boolean)
      .join(" | ")
    return [`${error.name}: ${error.message}`, extra, error.stack?.split("\n").slice(1, 6).join("\n")]
      .filter(Boolean)
      .join("\n")
  }
  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }
  return String(error)
}

/**
 * Écrit un log :
 *  - immédiatement sur la sortie standard (terminal local, Logs Vercel), en JSON ;
 *  - dans la table app_logs après la réponse (visible sur /admin/logs), si un utilisateur est connecté.
 * Ne lève jamais d'exception : un log raté ne doit pas casser l'action.
 */
export async function logEvent(entry: LogEntry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry })
  if (entry.level === "error") console.error(line)
  else if (entry.level === "warn") console.warn(line)
  else console.info(line)

  try {
    // Le client doit être créé avant after() : cookies() n'y est pas accessible depuis un Server Component.
    const supabase = await createClient()
    after(async () => {
      const { data } = await supabase.auth.getClaims()
      if (!data?.claims) return // visiteur non connecté : sortie standard uniquement
      const { error } = await supabase.from("app_logs").insert({
        level: entry.level,
        action: entry.action,
        ref: entry.ref,
        duration_ms: entry.durationMs ?? null,
        context: entry.context ?? {},
        error: entry.error ?? null,
      })
      if (error) console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", action: "logger.persist", ref: entry.ref, error: describeError(error) }))
    })
  } catch (error) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", action: "logger.schedule", ref: entry.ref, error: describeError(error) }))
  }
}
