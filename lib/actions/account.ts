"use server"

import { redirect } from "next/navigation"

import { ActionError, check, runAction } from "@/lib/actions/run"
import { logEvent, newRef } from "@/lib/logger"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/types"

export async function signOut() {
  await runAction("auth.sign_out", {}, async () => {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw new ActionError(`Déconnexion impossible : ${error.message}`, error)
    redirect("/login")
  })
}

export async function updatePassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction("auth.update_password", {}, async () => {
    const password = String(formData.get("password") ?? "")
    const confirm = String(formData.get("confirm") ?? "")
    if (password.length < 10) throw new ActionError("10 caractères minimum.")
    if (password !== confirm) throw new ActionError("Les deux mots de passe ne correspondent pas.")

    const supabase = await createClient()
    check(await supabase.auth.updateUser({ password }), "Changement du mot de passe")
    redirect("/")
  })
}

/** Erreur survenue dans le navigateur (error.tsx) : remontée dans les logs serveur. */
export async function reportClientError(report: { message: string; digest?: string; path: string }) {
  await logEvent({ level: "error", action: "client.error", ref: newRef(), context: report, error: report.message })
}
