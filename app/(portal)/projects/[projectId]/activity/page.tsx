import type { Metadata } from "next"
import { History } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { formatActivity } from "@/lib/activity"
import { formatDate, formatRelative } from "@/lib/format"
import { getProject } from "@/lib/projects"
import { createClient } from "@/lib/supabase/server"
import type { ActivityLog } from "@/lib/types"

export const metadata: Metadata = { title: "Journal d'activité" }

export default async function ActivityPage({ params }: PageProps<"/projects/[projectId]/activity">) {
  const { projectId } = await params
  const { isAdmin } = await getProject(projectId)
  const supabase = await createClient()

  const { data } = await supabase
    .from("activity_logs")
    .select("id, action, meta, created_at, visible_to_client, actor:profiles(full_name, email)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<ActivityLog[]>()
  const logs = data ?? []

  if (logs.length === 0) {
    return <EmptyState icon={History} title="Aucune activité" description="Chaque action sur le projet sera tracée ici." />
  }

  // Regroupement par jour.
  const days = new Map<string, ActivityLog[]>()
  for (const log of logs) {
    const day = log.created_at.slice(0, 10)
    days.set(day, [...(days.get(day) ?? []), log])
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      {[...days.entries()].map(([day, entries]) => (
        <section key={day}>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">{formatDate(day, "EEEE d MMMM yyyy")}</h3>
          <ol className="relative flex flex-col gap-4 border-l border-white/10 pl-5">
            {entries.map((log) => (
              <li key={log.id} className="relative">
                <span className="absolute top-1.5 -left-[23.5px] size-2 rounded-full border border-white/20 bg-background" />
                <p className="text-sm">{formatActivity(log)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDate(log.created_at, "HH:mm")} · {formatRelative(log.created_at)}
                  {isAdmin && !log.visible_to_client && " · privé"}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
