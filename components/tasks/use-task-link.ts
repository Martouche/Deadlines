"use client"

import { usePathname, useSearchParams } from "next/navigation"

/** Construit l'URL courante avec ?task=… (ou sans, pour fermer la fiche). */
export function useTaskLink() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (taskId: string | null) => {
    const params = new URLSearchParams(searchParams)
    if (taskId) params.set("task", taskId)
    else params.delete("task")
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }
}
