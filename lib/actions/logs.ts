"use server"

import { refresh } from "next/cache"

import { check, runAction } from "@/lib/actions/run"
import { assertAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/types"

export async function purgeLogs(olderThanDays: number): Promise<ActionResult> {
  return runAction("logs.purge", { olderThanDays }, async () => {
    await assertAdmin()
    const before = new Date(Date.now() - olderThanDays * 86_400_000).toISOString()
    const supabase = await createClient()
    check(await supabase.from("app_logs").delete().lt("created_at", before), "Purge des logs")
    refresh()
  })
}
