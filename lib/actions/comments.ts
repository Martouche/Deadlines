"use server"

import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/types"

// Ouvert aux clients : la RLS vérifie l'accès au projet et l'auteur.

export async function addComment(taskId: string, body: string): Promise<ActionResult> {
  const clean = body.trim()
  if (!clean) return { error: "Le commentaire est vide." }
  const supabase = await createClient()
  const { error } = await supabase.from("task_comments").insert({ task_id: taskId, body: clean })
  if (error) return { error: error.message }
  refresh()
  return {}
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("task_comments").delete().eq("id", commentId)
  if (error) return { error: error.message }
  refresh()
  return {}
}
