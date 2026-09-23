"use client"

import { useEffect, useState } from "react"

import { FormMessage } from "@/components/auth/form-message"
import { createClient } from "@/lib/supabase/client"

const EXPIRED = "Ce lien a expiré ou a déjà été utilisé. Demandes-en un nouveau."

/**
 * Ouvre la session à partir d'un fragment « #access_token=… » et redirige.
 * Renvoie un message d'erreur, ou null s'il n'y a rien à traiter.
 */
async function consumeHashSession(): Promise<string | null> {
  const params = new URLSearchParams(window.location.hash.slice(1))
  if (!params.has("access_token") && !params.has("error")) return null

  // Retire les jetons de l'URL (historique, captures d'écran, copier-coller).
  window.history.replaceState(null, "", window.location.pathname + window.location.search)

  if (params.has("error")) {
    return params.get("error_code") === "otp_expired" ? EXPIRED : "Lien de connexion invalide."
  }

  const { error } = await createClient().auth.setSession({
    access_token: params.get("access_token") ?? "",
    refresh_token: params.get("refresh_token") ?? "",
  })
  if (error) return EXPIRED

  // Rechargement complet : le serveur relit les cookies de session.
  const type = params.get("type")
  window.location.replace(type === "recovery" || type === "invite" ? "/compte/mot-de-passe" : "/")
  return null
}

/**
 * Prend en charge les liens Supabase au format « implicite » :
 *   /login#access_token=…&refresh_token=…&type=recovery
 * (ex. « Send password recovery » depuis le dashboard, anciens templates d'e-mail).
 * Le fragment (#…) n'est jamais envoyé au serveur : il faut le lire côté navigateur.
 */
export function HashSessionHandler() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    consumeHashSession().then(setError)
  }, [])

  return <FormMessage tone="error" message={error ?? undefined} />
}
