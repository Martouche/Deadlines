"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"

import { euros, formContext, requiredText, text } from "@/lib/actions/form"
import { check, checkRows, runAction } from "@/lib/actions/run"
import { assertAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult, ProjectStatus } from "@/lib/types"

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

/** Changement de statut rapide (bouton « Terminer » / « Rouvrir » sur les cartes). */
export async function setProjectStatus(projectId: string, status: ProjectStatus): Promise<ActionResult> {
  return runAction("projects.status", { projectId, status }, async () => {
    await assertAdmin()
    const supabase = await createClient()
    checkRows(
      await supabase.from("projects").update({ status }).eq("id", projectId).select("id"),
      "Changement de statut du projet",
    )
    refresh()
  })
}

/**
 * Duplique un projet comme modèle : tâches (remises au backlog, sans échéance),
 * étiquettes et sous-tâches (décochées). Ni documents, ni commentaires, ni temps.
 */
export async function duplicateProject(projectId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction("projects.duplicate", { projectId, ...formContext(formData) }, async () => {
    await assertAdmin()
    const supabase = await createClient()

    const source = check(
      await supabase.from("projects").select("description, budget_cents, currency").eq("id", projectId).single(),
      "Lecture du projet source",
    )
    const tasks = check(
      await supabase
        .from("tasks")
        .select("id, title, description, priority, position, task_labels(label_id), task_checklist_items(title, position)")
        .eq("project_id", projectId)
        .order("position"),
      "Lecture des tâches du projet source",
    )

    const created = check(
      await supabase
        .from("projects")
        .insert({
          client_id: requiredText(formData, "client_id", "Le client"),
          title: requiredText(formData, "title", "Le titre"),
          description: source.description,
          budget_cents: source.budget_cents,
          currency: source.currency,
          status: "active",
          financial_status: "quote_sent",
        })
        .select("id")
        .single(),
      "Création de la copie",
    )

    // Identifiants générés ici pour relier étiquettes et sous-tâches aux nouvelles tâches.
    const copies = tasks.map((t) => ({ source: t, id: crypto.randomUUID() }))
    if (copies.length > 0) {
      check(
        await supabase.from("tasks").insert(
          copies.map(({ source: t, id }) => ({
            id,
            project_id: created.id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            position: t.position,
            status: "backlog",
          })),
        ),
        "Copie des tâches",
      )
      const labels = copies.flatMap(({ source: t, id }) => t.task_labels.map((l) => ({ task_id: id, label_id: l.label_id })))
      if (labels.length > 0) check(await supabase.from("task_labels").insert(labels), "Copie des étiquettes")
      const items = copies.flatMap(({ source: t, id }) =>
        t.task_checklist_items.map((c) => ({ task_id: id, title: c.title, position: c.position })),
      )
      if (items.length > 0) check(await supabase.from("task_checklist_items").insert(items), "Copie des sous-tâches")
    }

    redirect(`/projects/${created.id}`)
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
