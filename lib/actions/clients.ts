"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"

import { formContext, requiredText, text } from "@/lib/actions/form"
import { ActionError, check, checkRows, runAction } from "@/lib/actions/run"
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
  return runAction("clients.create", formContext(formData), async () => {
    await assertAdmin()
    const supabase = await createClient()
    const created = check(
      await supabase.from("clients").insert(clientFields(formData)).select("id").single(),
      "Création du client",
    )
    redirect(`/admin/clients/${created.id}`)
  })
}

export async function updateClientRecord(clientId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction("clients.update", { clientId, ...formContext(formData) }, async () => {
    await assertAdmin()
    const supabase = await createClient()
    checkRows(
      await supabase.from("clients").update(clientFields(formData)).eq("id", clientId).select("id"),
      "Mise à jour du client",
    )
    refresh()
  })
}

export async function deleteClientRecord(clientId: string): Promise<ActionResult> {
  return runAction("clients.delete", { clientId }, async () => {
    await assertAdmin()
    const supabase = await createClient()
    const result = await supabase.from("clients").delete().eq("id", clientId).select("id")
    if (result.error?.code === "23503") throw new ActionError("Supprime d'abord les projets de ce client.", result.error)
    checkRows(result, "Suppression du client")
    redirect("/admin/clients")
  })
}

/**
 * Invite un contact : crée son compte Supabase (e-mail d'invitation),
 * le rattache au client et lui ouvre l'accès aux projets choisis.
 */
export async function inviteClientUser(clientId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction("clients.invite", { clientId, ...formContext(formData) }, async () => {
    await assertAdmin()
    const admin = createAdminClient()
    if (!admin) {
      throw new ActionError("Ajoute SUPABASE_SERVICE_ROLE_KEY aux variables d'environnement pour envoyer des invitations.")
    }

    const email = requiredText(formData, "email", "L'e-mail").toLowerCase()
    const fullName = text(formData, "full_name")
    const projectIds = formData.getAll("project_ids").map(String)
    const supabase = await createClient()

    // Compte déjà existant ? On le rattache sans renvoyer d'invitation.
    const existing = check(
      await supabase.from("profiles").select("id, role").eq("email", email).maybeSingle(),
      "Recherche du compte",
    )
    if (existing?.role === "admin") throw new ActionError("Ce compte est un administrateur.")

    let userId = existing?.id as string | undefined
    if (!userId) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${env.siteUrl}/auth/confirm`,
        data: fullName ? { full_name: fullName } : undefined,
      })
      if (error) throw new ActionError(`Invitation impossible : ${error.message}`, error)
      userId = data.user.id
    }

    checkRows(
      await supabase
        .from("profiles")
        .update({ client_id: clientId, ...(fullName ? { full_name: fullName } : {}) })
        .eq("id", userId)
        .select("id"),
      "Rattachement du compte au client",
    )

    if (projectIds.length > 0) {
      check(
        await supabase
          .from("project_members")
          .upsert(projectIds.map((project_id) => ({ project_id, profile_id: userId })), { ignoreDuplicates: true }),
        "Ouverture de l'accès aux projets",
      )
    }
    refresh()
  })
}
