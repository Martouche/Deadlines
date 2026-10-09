"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"

type RealtimeRefreshProps = { projectId: string; taskIds: string[] }

/**
 * Écoute Supabase Realtime (tâches du projet, nouveaux commentaires) et rafraîchit
 * la page : les cartes déplacées et les messages apparaissent sans recharger.
 * La RLS s'applique : on ne reçoit que ce qu'on a le droit de voir.
 */
export function RealtimeRefresh({ projectId, taskIds }: RealtimeRefreshProps) {
  const router = useRouter()
  // Les identifiants changent à chaque rendu : on les lit via une ref pour ne pas se réabonner.
  const taskIdsRef = useRef(new Set(taskIds))
  useEffect(() => {
    taskIdsRef.current = new Set(taskIds)
  }, [taskIds])

  useEffect(() => {
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | undefined
    // Plusieurs événements rapprochés (déplacement + journal…) → un seul rafraîchissement.
    const scheduleRefresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), 300)
    }

    const channel = supabase
      .channel(`project-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${projectId}` }, scheduleRefresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "task_comments" }, (payload) => {
        if (taskIdsRef.current.has((payload.new as { task_id: string }).task_id)) scheduleRefresh()
      })
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.warn("[realtime]", status, error)
      })

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [projectId, router])

  return null
}
