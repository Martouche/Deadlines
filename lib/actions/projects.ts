"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"

import { euros, formContext, requiredText, text } from "@/lib/actions/form"
import { check, checkRows, runAction } from "@/lib/actions/run"
import { assertAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/types"

function projectFields(formData: FormData) {
  return {
    client_id: requiredText(formData, "client_id", "Le client"),
    title: requiredText(formData, "title", "Le titre"),
    description: text(formData, "description"),
    status: text(formData, "status") ?? "active",
    financial_status: text(formData, "financial_status") ?? "quote_sent",
    budget_cents: euros(formData, "budget"),
    start_date: text(formData, "start_date"),
    deadline: text(formData, "deadline"),
  }
}

export async function createProject(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction("projects.create", formContext(formData), async () => {
    await assertAdmin()
    const supabase = await createClient()
    const created = check(
      await supabase.from("projects").insert(projectFields(formData)).select("id").single(),
      "Création du projet",
    )
    redirect(`/projects/${created.id}`)
  })
}

export async function updateProject(projectId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction("projects.update", { projectId, ...formContext(formData) }, async () => {
    await assertAdmin()
    const supabase = await createClient()
    checkRows(
      await supabase.from("projects").update(projectFields(formData)).eq("id", projectId).select("id"),
      "Mise à jour du projet",
    )
    refresh()
  })
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  return runAction("projects.delete", { projectId }, async () => {
    await assertAdmin()
    const supabase = await createClient()

    // Les fichiers Storage ne partent pas en cascade : on les supprime d'abord.
    const docs = check(
      await supabase
        .from("project_documents")
        .select("storage_path")
        .eq("project_id", projectId)
        .not("storage_path", "is", null),
      "Liste des fichiers du projet",
    )
    const paths = docs.map((d) => d.storage_path as string)
    if (paths.length > 0) {
      check(await supabase.storage.from("project-files").remove(paths), "Suppression des fichiers")
    }

    checkRows(await supabase.from("projects").delete().eq("id", projectId).select("id"), "Suppression du projet")
    redirect("/projects")
  })
}

export async function addProjectMember(projectId: string, profileId: string): Promise<ActionResult> {
  return runAction("projects.member.add", { projectId, profileId }, async () => {
    await assertAdmin()
    const supabase = await createClient()
    check(
      await supabase.from("project_members").insert({ project_id: projectId, profile_id: profileId }),
      "Ajout de l'accès",
    )
    refresh()
  })
}

export async function removeProjectMember(projectId: string, profileId: string): Promise<ActionResult> {
  return runAction("projects.member.remove", { projectId, profileId }, async () => {
    await assertAdmin()
    const supabase = await createClient()
    checkRows(
      await supabase
        .from("project_members")
        .delete()
        .eq("project_id", projectId)
        .eq("profile_id", profileId)
        .select("project_id"),
      "Retrait de l'accès",
    )
    refresh()
  })
}
