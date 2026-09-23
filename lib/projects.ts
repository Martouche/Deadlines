import "server-only"
import { cache } from "react"
import { notFound } from "next/navigation"

import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { ProjectOverview } from "@/lib/types"

/** Projet accessible à l'utilisateur (RLS) ; 404 sinon. Mis en cache pour la requête. */
export const getProject = cache(async (projectId: string) => {
  const profile = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase
    .from("project_overview")
    .select("*")
    .eq("id", projectId)
    .maybeSingle<ProjectOverview>()

  if (!data || (profile.role !== "admin" && data.status === "draft")) notFound()
  return { project: data, profile, isAdmin: profile.role === "admin" }
})
