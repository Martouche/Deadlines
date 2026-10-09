"use server"

import { refresh } from "next/cache"

import { ActionError, check, checkRows, runAction } from "@/lib/actions/run"
import { assertAdmin } from "@/lib/auth"
import { notify } from "@/lib/notify"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult, TaskPriority, TaskStatus } from "@/lib/types"

const STEP = 1024

type TaskInfo = { title: string; status: TaskStatus; project_id: string }

/** État de la tâche avant modification : sert à ne notifier que le passage en révision. */
async function taskInfo(supabase: Awaited<ReturnType<typeof createClient>>, taskId: string) {
  return check(
    await supabase.from("tasks").select("title, status, project_id").eq("id", taskId).single<TaskInfo>(),
    "Lecture de la tâche",
  )
}

/** Prévient le client qu'une étape attend sa validation. */
async function notifyReview(before: TaskInfo, taskId: string) {
  await notify({
    event: "review",
    projectId: before.project_id,
    subject: `Étape à valider : ${before.title}`,
    heading: "Une étape attend ta validation",
    body: `« ${before.title} » est prête pour la recette. Vérifie-la puis clique sur « Valider cette étape ».`,
    path: `/projects/${before.project_id}?task=${taskId}`,
  })
}

export async function createTask(projectId: string, status: TaskStatus, title: string): Promise<ActionResult> {
  return runAction("tasks.create", { projectId, status, title }, async () => {
    await assertAdmin()
    const clean = title.trim()
    if (!clean) throw new ActionError("Le titre est obligatoire.")

    const supabase = await createClient()
    const last = check(
      await supabase
        .from("tasks")
        .select("position")
        .eq("project_id", projectId)
        .eq("status", status)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle(),
      "Calcul de la position",
    )
    check(
      await supabase
        .from("tasks")
        .insert({ project_id: projectId, status, title: clean, position: (last?.position ?? 0) + STEP }),
      "Création de la tâche",
    )
    refresh()
  })
}

export type TaskPatch = Partial<{
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  deadline: string | null
}>

export async function updateTask(taskId: string, patch: TaskPatch): Promise<ActionResult> {
  return runAction("tasks.update", { taskId, patch }, async () => {
    await assertAdmin()
    if (patch.title !== undefined && !patch.title.trim()) throw new ActionError("Le titre est obligatoire.")
    const supabase = await createClient()
    const before = patch.status === "review" ? await taskInfo(supabase, taskId) : null
    checkRows(await supabase.from("tasks").update(patch).eq("id", taskId).select("id"), "Mise à jour de la tâche")
    if (before && before.status !== "review") await notifyReview(before, taskId)
    refresh()
  })
}

/** Déplacement Kanban : nouvelle colonne + position fractionnaire calculée côté client. */
export async function moveTask(taskId: string, status: TaskStatus, position: number): Promise<ActionResult> {
  return runAction("tasks.move", { taskId, status, position }, async () => {
    await assertAdmin()
    const supabase = await createClient()
    const before = status === "review" ? await taskInfo(supabase, taskId) : null
    checkRows(
      await supabase.from("tasks").update({ status, position }).eq("id", taskId).select("id"),
      "Déplacement de la tâche",
    )
    if (before && before.status !== "review") await notifyReview(before, taskId)
    // Les nouvelles données arrivent dans la même transition que l'état optimiste du Kanban.
    refresh()
  })
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  return runAction("tasks.delete", { taskId }, async () => {
    await assertAdmin()
    const supabase = await createClient()
    checkRows(await supabase.from("tasks").delete().eq("id", taskId).select("id"), "Suppression de la tâche")
    refresh()
  })
}

export async function setTaskLabels(taskId: string, labelIds: string[]): Promise<ActionResult> {
  return runAction("tasks.labels", { taskId, labelIds }, async () => {
    await assertAdmin()
    const supabase = await createClient()
    check(await supabase.from("task_labels").delete().eq("task_id", taskId), "Mise à jour des étiquettes")
    if (labelIds.length > 0) {
      check(
        await supabase.from("task_labels").insert(labelIds.map((label_id) => ({ task_id: taskId, label_id }))),
        "Mise à jour des étiquettes",
      )
    }
    refresh()
  })
}

/** Action client : « Validée par le client » (RPC dédiée, le client n'a aucun droit UPDATE). */
export async function validateTask(taskId: string): Promise<ActionResult> {
  return runAction("tasks.validate", { taskId }, async () => {
    const supabase = await createClient()
    check(await supabase.rpc("validate_task", { p_task_id: taskId }), "Validation de l'étape")
    const task = await taskInfo(supabase, taskId)
    await notify({
      event: "validated",
      projectId: task.project_id,
      subject: `Étape validée : ${task.title}`,
      heading: "Le client a validé une étape",
      body: `« ${task.title} » a été validée par le client.`,
      path: `/projects/${task.project_id}?task=${taskId}`,
    })
    refresh()
  })
}

/** Ouverture d'une tâche : remet à zéro son badge « non lu ». Ouvert aux clients. */
export async function markTaskRead(taskId: string): Promise<ActionResult> {
  return runAction("tasks.read", { taskId }, async () => {
    const supabase = await createClient()
    const { error } = await supabase
      .from("task_reads")
      .upsert({ task_id: taskId, last_read_at: new Date().toISOString() }, { onConflict: "user_id,task_id" })
    // Table absente (migration non appliquée) : pas de badge, mais pas d'erreur affichée à chaque ouverture.
    if (error?.code === "PGRST205") return
    check({ data: null, error }, "Marquage comme lu")
    // Pas de refresh() : la tâche ouverte n'a pas de badge, et la fermer recharge la page.
  })
}

export async function addChecklistItem(taskId: string, title: string): Promise<ActionResult> {
  return runAction("checklist.add", { taskId, title }, async () => {
    await assertAdmin()
    const clean = title.trim()
    if (!clean) throw new ActionError("La sous-tâche est vide.")
    const supabase = await createClient()
    check(
      await supabase.from("task_checklist_items").insert({ task_id: taskId, title: clean, position: Date.now() }),
      "Ajout de la sous-tâche",
    )
    refresh()
  })
}

export async function toggleChecklistItem(itemId: string, isDone: boolean): Promise<ActionResult> {
  return runAction("checklist.toggle", { itemId, isDone }, async () => {
    await assertAdmin()
    const supabase = await createClient()
    checkRows(
      await supabase.from("task_checklist_items").update({ is_done: isDone }).eq("id", itemId).select("id"),
      "Mise à jour de la sous-tâche",
    )
    refresh()
  })
}

export async function deleteChecklistItem(itemId: string): Promise<ActionResult> {
  return runAction("checklist.delete", { itemId }, async () => {
    await assertAdmin()
    const supabase = await createClient()
    checkRows(
      await supabase.from("task_checklist_items").delete().eq("id", itemId).select("id"),
      "Suppression de la sous-tâche",
    )
    refresh()
  })
}
