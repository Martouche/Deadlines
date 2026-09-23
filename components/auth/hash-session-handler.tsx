"use client"

import { useEffect, useState } from "react"

import { FormMessage } from "@/components/auth/form-message"
import { createClient } from "@/lib/supabase/client"

/**
 * Prend en charge les liens Supabase au format « implicite » :
 *   /login#access_token=…&refresh_token=…&type=recovery
 * (ex. « Send password recovery » depuis le dashboard, anciens templates d'e-mail).
 * Le fragment (#…) n'est jamais envoyé au serveur : il faut le lire côté navigateur.
 */
export function HashSessionHandler() {
  const [error, setError] = useState<string>()

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    if (!params.has("access_token") && !params.has("error")) return

    // Retire les jetons de l'URL (historique, captures d'écran, copier-coller).
    window.history.replaceState(null, "", window.location.pathname + window.location.search)

    if (params.has("error")) {
      setError(
        params.get("error_code") === "otp_expired"
          ? "Ce lien a expiré ou a déjà été utilisé. Demandes-en un nouveau."
          : "Lien de connexion invalide.",
      )
      return
    }

    const access_token = params.get("access_token") ?? ""
    const refresh_token = params.get("refresh_token") ?? ""
    const type = params.get("type")

    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setError("Ce lien a expiré ou a déjà été utilisé. Demandes-en un nouveau.")
          return
        }
        // Rechargement complet : le serveur relit les cookies de session.
        window.location.replace(type === "recovery" || type === "invite" ? "/compte/mot-de-passe" : "/")
      })
  }, [])

  return <FormMessage tone="error" message={error} />
}
