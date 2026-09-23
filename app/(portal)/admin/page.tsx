import type { Metadata } from "next"
import Link from "next/link"
import { FolderKanban, Plus } from "lucide-react"
import { addDays, format, startOfMonth } from "date-fns"

import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { ProjectCard } from "@/components/project/project-card"
import { PriorityBadge } from "@/components/project/status-badges"
import { buttonVariants } from "@/components/ui/button"
import { formatDeadline, formatMinutes } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import type { ProjectOverview, TaskPriority } from "@/lib/types"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Tableau de bord" }

type UpcomingTask = {
  id: string
  title: string
  deadline: string
  priority: TaskPriority
  project_id: string
  project: { title: string } | null
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const today = new Date()

  const [{ data: projects }, { data: upcoming }, { data: timeRows }] = await Promise.all([
    supabase
      .from("project_overview")
      .select("*")
      .in("status", ["active", "on_hold"])
      .order("next_deadline", { ascending: true, nullsFirst: false })
      .returns<ProjectOverview[]>(),
    supabase
      .from("tasks")
      .select("id, title, deadline, priority, project_id, project:projects(title)")
      .neq("status", "done")
      .not("deadline", "is", null)
      .lte("deadline", format(addDays(today, 14), "yyyy-MM-dd"))
      .order("deadline")
      .limit(8)
      .returns<UpcomingTask[]>(),
    supabase.from("time_entries").select("minutes").gte("started_at", startOfMonth(today).toISOString()),
  ])

  const active = projects ?? []
  const minutesThisMonth = (timeRows ?? []).reduce((sum, r) => sum + (r.minutes ?? 0), 0)
  const stats = [
    { label: "Projets en cours", value: String(active.length) },
    { label: "Tâches en retard", value: String(active.reduce((s, p) => s + p.overdue_tasks, 0)), alert: true },
    { label: "À valider par les clients", value: String(active.reduce((s, p) => s + p.awaiting_validation, 0)) },
    { label: "Temps ce mois-ci", value: formatMinutes(minutesThisMonth) },
  ]

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Vue d'ensemble"
        title="Tableau de bord"
        actions={
          <Link href="/projects/new" className={buttonVariants({ size: "lg" })}>
            <Plus /> Nouveau projet
          </Link>
        }
      />

      <dl className="grid grid-cols-2 divide-white/10 overflow-hidden rounded-xl border border-white/10 lg:grid-cols-4 lg:divide-x">
        {stats.map((s) => (
          <div key={s.label} className="border-white/10 p-5 max-lg:odd:border-r max-lg:[&:nth-child(-n+2)]:border-b">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd
              className={cn(
                "mt-2 font-heading text-3xl font-semibold tracking-tight",
                s.alert && s.value !== "0" && "text-red-300",
              )}
            >
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-10 xl:grid-cols-[1fr_340px]">
        <section>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Projets en cours</h2>
          {active.length === 0 ? (
            <EmptyState icon={FolderKanban} title="Aucun projet en cours" description="Crée un client puis son premier projet.">
              <Link href="/admin/clients" className={buttonVariants({ variant: "outline" })}>
                Aller aux clients
              </Link>
            </EmptyState>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {active.map((p) => (
                <ProjectCard key={p.id} project={p} showClient />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Échéances des 14 prochains jours</h2>
          <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
            {(upcoming ?? []).length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">Rien à l&apos;horizon.</li>
            )}
            {(upcoming ?? []).map((t) => (
              <li key={t.id}>
                <Link
                  href={`/projects/${t.project_id}?task=${t.id}`}
                  className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{t.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.project?.title}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={cn("text-xs", t.deadline < format(today, "yyyy-MM-dd") ? "text-red-300" : "text-muted-foreground")}>
                      {formatDeadline(t.deadline)}
                    </span>
                    <PriorityBadge priority={t.priority} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
