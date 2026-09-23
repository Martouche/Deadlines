"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export type PasswordState = { status: "idle" | "error"; message?: string }

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function updatePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const password = String(formData.get("password") ?? "")
  const confirm = String(formData.get("confirm") ?? "")
  if (password.length < 10) return { status: "error", message: "10 caractères minimum." }
  if (password !== confirm) return { status: "error", message: "Les deux mots de passe ne correspondent pas." }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { status: "error", message: error.message }

  redirect("/")
}
