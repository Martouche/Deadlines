"use server"

import { refresh } from "next/cache"

import { formContext, requiredText, text } from "@/lib/actions/form"
import { ActionError, check, checkRows, runAction } from "@/lib/actions/run"
import { assertAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/types"

export async function startTimer(projectId: string, taskId: string | null): Promise<ActionResult> {
  return runAction("time.start", { projectId, taskId }, async () => {
    await assertAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from("time_entries").insert({ project_id: projectId, task_id: taskId })
    if (error?.code === "23505") throw new ActionError("Un chrono tourne déjà : arrête-le d'abord.", error)
    check({ data: null, error }, "Démarrage du chrono")
    refresh()
  })
}

export async function stopTimer(entryId: string): Promise<ActionResult> {
  return runAction("time.stop", { entryId }, async () => {
    await assertAdmin()
    const supabase = await createClient()
    checkRows(
      await supabase
        .from("time_entries")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", entryId)
        .select("id"),
      "Arrêt du chrono",
    )
    refresh()
  })
}

export async function addManualEntry(projectId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction("time.manual.add", { projectId, ...formContext(formData) }, async () => {
    await assertAdmin()
    const date = requiredText(formData, "date", "La date")
    const hours = Number(text(formData, "hours") ?? 0)
    const minutes = Number(text(formData, "minutes") ?? 0)
    const total = Math.round(hours * 60 + minutes)
    if (!Number.isFinite(total) || total <= 0) throw new ActionError("Indique une durée.")

    const startedAt = new Date(`${date}T09:00:00`)
    const endedAt = new Date(startedAt.getTime() + total * 60_000)

    const supabase = await createClient()
    check(
      await supabase.from("time_entries").insert({
        project_id: projectId,
        task_id: text(formData, "task_id"),
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        note: text(formData, "note"),
        billable: formData.get("billable") === "on",
      }),
      "Ajout du temps",
    )
    refresh()
  })
}

export async function deleteTimeEntry(entryId: string): Promise<ActionResult> {
  return runAction("time.delete", { entryId }, async () => {
    await assertAdmin()
    const supabase = await createClient()
    checkRows(await supabase.from("time_entries").delete().eq("id", entryId).select("id"), "Suppression du temps")
    refresh()
  })
}
