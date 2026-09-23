"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"

import { FormError, euros, formErrorMessage, requiredText, text } from "@/lib/actions/form"
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
  await assertAdmin()
  let id: string
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("projects").insert(projectFields(formData)).select("id").single()
    if (error) throw new FormError(error.message)
    id = data.id
  } catch (error) {
    return { error: formErrorMessage(error) }
  }
  redirect(`/projects/${id}`)
}

export async function updateProject(projectId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await assertAdmin()
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("projects").update(projectFields(formData)).eq("id", projectId)
    if (error) throw new FormError(error.message)
  } catch (error) {
    return { error: formErrorMessage(error) }
  }
  refresh()
  return {}
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  await assertAdmin()
  const supabase = await createClient()

  // Les fichiers Storage ne partent pas en cascade : on les supprime d'abord.
  const { data: docs } = await supabase
    .from("project_documents")
    .select("storage_path")
    .eq("project_id", projectId)
    .not("storage_path", "is", null)
  const paths = (docs ?? []).map((d) => d.storage_path as string)
  if (paths.length > 0) await supabase.storage.from("project-files").remove(paths)

  const { error } = await supabase.from("projects").delete().eq("id", projectId)
  if (error) return { error: error.message }
  redirect("/projects")
}

export async function addProjectMember(projectId: string, profileId: string): Promise<ActionResult> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from("project_members").insert({ project_id: projectId, profile_id: profileId })
  if (error) return { error: error.message }
  refresh()
  return {}
}

export async function removeProjectMember(projectId: string, profileId: string): Promise<ActionResult> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("profile_id", profileId)
  if (error) return { error: error.message }
  refresh()
  return {}
}
