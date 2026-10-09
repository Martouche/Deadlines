import "server-only"
import { unstable_rethrow } from "next/navigation"

import { describeError, logEvent, newRef } from "@/lib/logger"
import type { ActionResult } from "@/lib/types"

/** Erreur « attendue » : son message est montré tel quel à l'utilisateur. */
export class ActionError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = "ActionError"
  }
}

/**
 * Exécute une Server Action en la journalisant (succès, échec, durée, contexte)
 * et garantit un résultat { error } lisible quoi qu'il arrive. Chaque message
 * d'erreur porte une référence qui permet de retrouver le log sur /admin/logs.
 */
export async function runAction<T extends ActionResult>(
  action: string,
  context: Record<string, unknown>,
  fn: () => Promise<T | void>,
): Promise<T | ActionResult> {
  const ref = newRef()
  const started = Date.now()
  const elapsed = () => Date.now() - started

  try {
    const result: ActionResult = (await fn()) ?? {}
    await logEvent({
      level: result.error ? "warn" : "info",
      action,
      ref,
      context,
      durationMs: elapsed(),
      error: result.error,
    })
    return result.error ? { ...result, error: withRef(result.error, ref) } : (result as T)
  } catch (error) {
    // redirect() / notFound() : ce n'est pas une erreur, on laisse Next les traiter.
    try {
      unstable_rethrow(error)
    } catch (control) {
      await logEvent({ level: "info", action, ref, context, durationMs: elapsed() })
      throw control
    }

    if (error instanceof ActionError) {
      await logEvent({
        level: "warn",
        action,
        ref,
        context,
        durationMs: elapsed(),
        error: error.cause ? `${error.message}\n${describeError(error.cause)}` : error.message,
      })
      return { error: withRef(error.message, ref) }
    }

    await logEvent({ level: "error", action, ref, context, durationMs: elapsed(), error: describeError(error) })
    return { error: withRef("Erreur inattendue côté serveur.", ref) }
  }
}

function withRef(message: string, ref: string) {
  return `${message} (réf. ${ref})`
}

/** Erreur Supabase (PostgREST, Storage, Auth) : au minimum un message, souvent un code. */
type DbError = { message: string; code?: string }

/** Traduit une erreur Postgres/PostgREST en message compréhensible. */
function friendlyDbError(error: DbError, what: string) {
  switch (error.code) {
    case "42501":
    case "PGRST301":
      return `${what} : permission refusée.`
    case "23505":
      return `${what} : cet élément existe déjà.`
    case "23503":
      return `${what} : un élément lié est introuvable ou encore utilisé ailleurs.`
    case "23502":
    case "23514":
    case "22P02":
    case "22007":
    case "22008":
      return `${what} : valeur invalide.`
    case "PGRST116":
      return `${what} : élément introuvable.`
    case "PGRST205":
      return `${what} : table introuvable (migration Supabase non appliquée ?).`
    case "P0001":
    case "P0002":
    case "22023":
      return error.message // messages déjà rédigés dans nos fonctions SQL
    default:
      return `${what} : ${error.message}`
  }
}

type DbResponse = { data: unknown; error: DbError | null }

/** Type de `data` dans la branche « succès » d'une réponse Supabase (union succès | échec). */
type DataOf<R> = R extends { error: null; data: infer D } ? D : never

/** Lève une ActionError si la requête a échoué, renvoie les données sinon. */
export function check<R extends DbResponse>(result: R, what: string): DataOf<R> {
  if (result.error) throw new ActionError(friendlyDbError(result.error, what), result.error)
  return result.data as DataOf<R>
}

/**
 * Pour UPDATE/DELETE suivis de .select() : sans ligne renvoyée, rien n'a été modifié.
 * La RLS ne lève pas d'erreur dans ce cas, elle filtre silencieusement.
 */
export function checkRows<R extends DbResponse>(result: R, what: string): DataOf<R> {
  const rows = check(result, what)
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ActionError(`${what} : aucune modification enregistrée (élément introuvable ou accès refusé).`)
  }
  return rows
}
