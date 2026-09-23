"use server"

import { refresh } from "next/cache"

import { assertAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult, TaskPriority, TaskStatus } from "@/lib/types"

const STEP = 1024

export async function createTask(projectId: string, status: TaskStatus, title: string): Promise<ActionResult> {
  await assertAdmin()
  const clean = title.trim()
  if (!clean) return { error: "Le titre est obligatoire." }

  const supabase = await createClient()
  const { data: last } = await supabase
    .from("tasks")
    .select("position")
    .eq("project_id", projectId)
    .eq("status", status)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase
    .from("tasks")
    .insert({ project_id: projectId, status, title: clean, position: (last?.position ?? 0) + STEP })
  if (error) return { error: error.message }
  refresh()
  return {}
}

export type TaskPatch = Partial<{
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  deadline: string | null
}>

export async function updateTask(taskId: string, patch: TaskPatch): Promise<ActionResult> {
  await assertAdmin()
  if (patch.title !== undefined && !patch.title.trim()) return { error: "Le titre est obligatoire." }

  const supabase = await createClient()
  const { error } = await supabase.from("tasks").update(patch).eq("id", taskId)
  if (error) return { error: error.message }
  refresh()
  return {}
}

/** Déplacement Kanban : nouvelle colonne + position fractionnaire calculée côté client. */
export async function moveTask(taskId: string, status: TaskStatus, position: number): Promise<ActionResult> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from("tasks").update({ status, position }).eq("id", taskId)
  if (error) return { error: error.message }
  // Les nouvelles données arrivent dans la même transition que l'état optimiste du Kanban.
  refresh()
  return {}
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from("tasks").delete().eq("id", taskId)
  if (error) return { error: error.message }
  refresh()
  return {}
}

export async function setTaskLabels(taskId: string, labelIds: string[]): Promise<ActionResult> {
  await assertAdmin()
  const supabase = await createClient()
  const { error: deleteError } = await supabase.from("task_labels").delete().eq("task_id", taskId)
  if (deleteError) return { error: deleteError.message }
  if (labelIds.length > 0) {
    const { error } = await supabase
      .from("task_labels")
      .insert(labelIds.map((label_id) => ({ task_id: taskId, label_id })))
    if (error) return { error: error.message }
  }
  refresh()
  return {}
}

/** Action client : « Validée par le client » (RPC dédiée, le client n'a aucun droit UPDATE). */
export async function validateTask(taskId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("validate_task", { p_task_id: taskId })
  if (error) return { error: error.message }
  refresh()
  return {}
}

export async function addChecklistItem(taskId: string, title: string): Promise<ActionResult> {
  await assertAdmin()
  const clean = title.trim()
  if (!clean) return {}
  const supabase = await createClient()
  const { error } = await supabase
    .from("task_checklist_items")
    .insert({ task_id: taskId, title: clean, position: Date.now() })
  if (error) return { error: error.message }
  refresh()
  return {}
}

export async function toggleChecklistItem(itemId: string, isDone: boolean): Promise<ActionResult> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from("task_checklist_items").update({ is_done: isDone }).eq("id", itemId)
  if (error) return { error: error.message }
  refresh()
  return {}
}

export async function deleteChecklistItem(itemId: string): Promise<ActionResult> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from("task_checklist_items").delete().eq("id", itemId)
  if (error) return { error: error.message }
  refresh()
  return {}
}
