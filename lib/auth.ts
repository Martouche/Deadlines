import "server-only"
import { cache } from "react"
import { notFound, redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export type UserRole = "admin" | "client"

export type Profile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  client_id: string | null
}

/** Profil de l'utilisateur connecté (mis en cache pour la durée de la requête). */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, client_id")
    .eq("id", user.id)
    .maybeSingle()

  // Connecté mais sans profil : la migration n'est pas appliquée (ou le trigger a échoué).
  // On lève une erreur plutôt que de renvoyer vers /login (boucle de redirection).
  if (error || !data) {
    throw new Error("Profil introuvable. La migration Supabase a-t-elle été appliquée ?")
  }
  return data
})

export async function requireUser() {
  const profile = await getProfile()
  if (!profile) redirect("/login")
  return profile
}

export async function requireAdmin() {
  const profile = await requireUser()
  if (profile.role !== "admin") notFound()
  return profile
}

/** Pour les Server Actions : erreur explicite plutôt qu'une page 404. La RLS reste la vraie barrière. */
export async function assertAdmin() {
  const profile = await getProfile()
  if (profile?.role !== "admin") throw new Error("Action réservée à l'administrateur.")
  return profile
}
