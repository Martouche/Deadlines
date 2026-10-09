"use server"

import { refresh } from "next/cache"

import { ActionError, check, checkRows, runAction } from "@/lib/actions/run"
import { getProfile } from "@/lib/auth"
import { displayName } from "@/lib/format"
import { notify } from "@/lib/notify"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/types"

// Ouvert aux clients : la RLS vérifie l'accès au projet et l'auteur.

export async function addComment(taskId: string, body: string): Promise<ActionResult> {
  return runAction("comments.add", { taskId, length: body.length }, async () => {
    const clean = body.trim()
    if (!clean) throw new ActionError("Le commentaire est vide.")
    const supabase = await createClient()
    check(await supabase.from("task_comments").insert({ task_id: taskId, body: clean }), "Envoi du commentaire")

    const task = check(
      await supabase.from("tasks").select("title, project_id").eq("id", taskId).single(),
      "Lecture de la tâche",
    )
    const author = await getProfile()
    await notify({
      event: "comment",
      projectId: task.project_id,
      subject: `Nouveau message : ${task.title}`,
      heading: `${displayName(author)} a écrit sur « ${task.title} »`,
      body: clean.length > 600 ? `${clean.slice(0, 600)}…` : clean,
      path: `/projects/${task.project_id}?task=${taskId}`,
    })
    refresh()
  })
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  return runAction("comments.delete", { commentId }, async () => {
    const supabase = await createClient()
    checkRows(
      await supabase.from("task_comments").delete().eq("id", commentId).select("id"),
      "Suppression du commentaire",
    )
    refresh()
  })
}
