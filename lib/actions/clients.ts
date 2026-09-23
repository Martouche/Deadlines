"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"

import { FormError, formErrorMessage, requiredText, text } from "@/lib/actions/form"
import { assertAdmin } from "@/lib/auth"
import { env } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/types"

function clientFields(formData: FormData) {
  return {
    name: requiredText(formData, "name", "Le nom"),
    company: text(formData, "company"),
    email: requiredText(formData, "email", "L'e-mail").toLowerCase(),
    phone: text(formData, "phone"),
    notes: text(formData, "notes"),
  }
}

export async function createClientRecord(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await assertAdmin()
  let id: string
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("clients").insert(clientFields(formData)).select("id").single()
    if (error) throw new FormError(error.message)
    id = data.id
  } catch (error) {
    return { error: formErrorMessage(error) }
  }
  redirect(`/admin/clients/${id}`)
}

export async function updateClientRecord(clientId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await assertAdmin()
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("clients").update(clientFields(formData)).eq("id", clientId)
    if (error) throw new FormError(error.message)
  } catch (error) {
    return { error: formErrorMessage(error) }
  }
  refresh()
  return {}
}

export async function deleteClientRecord(clientId: string): Promise<ActionResult> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from("clients").delete().eq("id", clientId)
  if (error) {
    return { error: error.code === "23503" ? "Supprime d'abord les projets de ce client." : error.message }
  }
  redirect("/admin/clients")
}

/**
 * Invite un contact : crée son compte Supabase (e-mail d'invitation),
 * le rattache au client et lui ouvre l'accès aux projets choisis.
 */
export async function inviteClientUser(clientId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await assertAdmin()
  const admin = createAdminClient()
  if (!admin) {
    return { error: "Ajoute SUPABASE_SERVICE_ROLE_KEY aux variables d'environnement pour envoyer des invitations." }
  }

  let email: string
  try {
    email = requiredText(formData, "email", "L'e-mail").toLowerCase()
  } catch (error) {
    return { error: formErrorMessage(error) }
  }
  const fullName = text(formData, "full_name")
  const projectIds = formData.getAll("project_ids").map(String)

  const supabase = await createClient()

  // Compte déjà existant ? On le rattache sans renvoyer d'invitation.
  const { data: existing } = await supabase.from("profiles").select("id, role").eq("email", email).maybeSingle()
  let userId = existing?.id as string | undefined

  if (existing?.role === "admin") return { error: "Ce compte est un administrateur." }

  if (!userId) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${env.siteUrl}/auth/confirm`,
      data: fullName ? { full_name: fullName } : undefined,
    })
    if (error) return { error: `Invitation impossible : ${error.message}` }
    userId = data.user.id
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ client_id: clientId, ...(fullName ? { full_name: fullName } : {}) })
    .eq("id", userId)
  if (profileError) return { error: profileError.message }

  if (projectIds.length > 0) {
    const { error } = await supabase
      .from("project_members")
      .upsert(projectIds.map((project_id) => ({ project_id, profile_id: userId })), { ignoreDuplicates: true })
    if (error) return { error: error.message }
  }

  refresh()
  return {}
}
