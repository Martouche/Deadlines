"use server"

import { redirect, unstable_rethrow } from "next/navigation"

import { env } from "@/lib/env"
import { describeError, logEvent, newRef } from "@/lib/logger"
import { safeNextPath } from "@/lib/safe-redirect"
import { createClient } from "@/lib/supabase/server"

export type LoginState = { status: "idle" | "error" | "sent"; message?: string }

function readEmail(formData: FormData) {
  return String(formData.get("email") ?? "").trim().toLowerCase()
}

/** Journalise la tentative ; toute exception devient un message affichable avec référence. */
async function logged(action: string, email: string, fn: (ref: string) => Promise<LoginState>): Promise<LoginState> {
  const ref = newRef()
  const started = Date.now()
  try {
    const state = await fn(ref)
    await logEvent({
      level: state.status === "error" ? "warn" : "info",
      action,
      ref,
      context: { email },
      durationMs: Date.now() - started,
      error: state.status === "error" ? state.message : undefined,
    })
    return state
  } catch (error) {
    unstable_rethrow(error) // redirect() après connexion réussie
    await logEvent({ level: "error", action, ref, context: { email }, durationMs: Date.now() - started, error: describeError(error) })
    return { status: "error", message: `Erreur inattendue (réf. ${ref}).` }
  }
}

export async function signInWithMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = readEmail(formData)
  return logged("auth.magic_link", email, async (ref) => {
    if (!email) return { status: "error", message: "Indique ton adresse e-mail." }

    const next = safeNextPath(String(formData.get("next") ?? ""))
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Pas d'inscription libre : seuls les comptes invités peuvent se connecter.
        shouldCreateUser: false,
        emailRedirectTo: `${env.siteUrl}/auth/confirm?next=${encodeURIComponent(next)}`,
      },
    })

    // 400/422 = compte inexistant : même réponse que s'il existait (pas d'énumération des clients).
    if (error && error.status !== 400 && error.status !== 422) {
      await logEvent({ level: "error", action: "auth.magic_link.supabase", ref, context: { email }, error: describeError(error) })
      return { status: "error", message: `Envoi impossible pour le moment (${error.message}). Réf. ${ref}.` }
    }
    return { status: "sent", message: `Si un compte existe pour ${email}, un lien de connexion vient d'être envoyé.` }
  })
}

export async function signInWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = readEmail(formData)
  return logged("auth.password", email, async (ref) => {
    const password = String(formData.get("password") ?? "")
    if (!email || !password) return { status: "error", message: "E-mail et mot de passe requis." }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.code === "invalid_credentials") return { status: "error", message: "Identifiants incorrects." }
      if (error.code === "email_not_confirmed") {
        return { status: "error", message: "Adresse e-mail pas encore confirmée. Utilise le lien reçu par e-mail." }
      }
      // Erreur de configuration (clé API, URL…) ou panne Supabase.
      await logEvent({ level: "error", action: "auth.password.supabase", ref, context: { email }, error: describeError(error) })
      return { status: "error", message: `Connexion impossible pour le moment (${error.message}). Réf. ${ref}.` }
    }

    redirect(safeNextPath(String(formData.get("next") ?? "")))
  })
}
