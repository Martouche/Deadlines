"use server"

import { refresh } from "next/cache"

import { ActionError, check, checkRows, runAction } from "@/lib/actions/run"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/types"

// Ouvert aux clients : la RLS vérifie l'accès au projet et l'auteur.

export async function addComment(taskId: string, body: string): Promise<ActionResult> {
  return runAction("comments.add", { taskId, length: body.length }, async () => {
    const clean = body.trim()
    if (!clean) throw new ActionError("Le commentaire est vide.")
    const supabase = await createClient()
    check(await supabase.from("task_comments").insert({ task_id: taskId, body: clean }), "Envoi du commentaire")
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
