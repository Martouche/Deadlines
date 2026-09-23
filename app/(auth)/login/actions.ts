"use server"

import { redirect } from "next/navigation"

import { env } from "@/lib/env"
import { safeNextPath } from "@/lib/safe-redirect"
import { createClient } from "@/lib/supabase/server"

export type LoginState = { status: "idle" | "error" | "sent"; message?: string }

function readEmail(formData: FormData) {
  return String(formData.get("email") ?? "").trim().toLowerCase()
}

export async function signInWithMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = readEmail(formData)
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

  // Même réponse que le compte existe ou non (pas d'énumération des clients).
  if (error && error.status !== 400 && error.status !== 422) {
    console.error("[login] signInWithOtp", error.status, error.code, error.message)
    return { status: "error", message: "Envoi impossible pour le moment. Réessaie dans une minute." }
  }
  return { status: "sent", message: `Si un compte existe pour ${email}, un lien de connexion vient d'être envoyé.` }
}

export async function signInWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = readEmail(formData)
  const password = String(formData.get("password") ?? "")
  if (!email || !password) return { status: "error", message: "E-mail et mot de passe requis." }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (error.code === "invalid_credentials") return { status: "error", message: "Identifiants incorrects." }
    if (error.code === "email_not_confirmed") {
      return { status: "error", message: "Adresse e-mail pas encore confirmée. Utilise le lien reçu par e-mail." }
    }
    // Erreur de configuration (clé API, URL…) ou panne : visible dans les logs Vercel.
    console.error("[login] signInWithPassword", error.status, error.code, error.message)
    return { status: "error", message: "Connexion impossible pour le moment. Réessaie plus tard." }
  }

  redirect(safeNextPath(String(formData.get("next") ?? "")))
}
