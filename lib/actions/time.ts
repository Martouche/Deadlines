"use server"

import { refresh } from "next/cache"

import { FormError, formErrorMessage, requiredText, text } from "@/lib/actions/form"
import { assertAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/types"

export async function startTimer(projectId: string, taskId: string | null): Promise<ActionResult> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from("time_entries").insert({ project_id: projectId, task_id: taskId })
  if (error) {
    return { error: error.code === "23505" ? "Un chrono tourne déjà : arrête-le d'abord." : error.message }
  }
  refresh()
  return {}
}

export async function stopTimer(entryId: string): Promise<ActionResult> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from("time_entries")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", entryId)
  if (error) return { error: error.message }
  refresh()
  return {}
}

export async function addManualEntry(projectId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await assertAdmin()
  try {
    const date = requiredText(formData, "date", "La date")
    const hours = Number(text(formData, "hours") ?? 0)
    const minutes = Number(text(formData, "minutes") ?? 0)
    const total = Math.round(hours * 60 + minutes)
    if (!Number.isFinite(total) || total <= 0) throw new FormError("Indique une durée.")

    const startedAt = new Date(`${date}T09:00:00`)
    const endedAt = new Date(startedAt.getTime() + total * 60_000)

    const supabase = await createClient()
    const { error } = await supabase.from("time_entries").insert({
      project_id: projectId,
      task_id: text(formData, "task_id"),
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      note: text(formData, "note"),
      billable: formData.get("billable") === "on",
    })
    if (error) throw new FormError(error.message)
  } catch (error) {
    return { error: formErrorMessage(error) }
  }
  refresh()
  return {}
}

export async function deleteTimeEntry(entryId: string): Promise<ActionResult> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from("time_entries").delete().eq("id", entryId)
  if (error) return { error: error.message }
  refresh()
  return {}
}
