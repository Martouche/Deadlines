"use server"

import { cookies } from "next/headers"

import { ActionError, runAction } from "@/lib/actions/run"
import { THEME_COOKIE, type Theme } from "@/lib/theme"
import type { ActionResult } from "@/lib/types"

export async function setTheme(theme: Theme): Promise<ActionResult> {
  return runAction("theme.set", { theme }, async () => {
    if (theme !== "light" && theme !== "dark") throw new ActionError("Thème inconnu.")
    ;(await cookies()).set(THEME_COOKIE, theme, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
  })
}
