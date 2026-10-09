import type { Metadata } from "next"
import Link from "next/link"
import { CalendarCheck2, CheckCheck } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { ParamSelect } from "@/components/app/param-select"
import { PriorityBadge, TaskStatusBadge } from "@/components/project/status-badges"
import { requireUser } from "@/lib/auth"
import { read } from "@/lib/data"
import { formatDate, formatDeadline } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import { groupByDeadline } from "@/lib/task-groups"
import type { ProjectStatus, TaskPriority, TaskStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Échéances" }

type DueTask = {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  deadline: string | null
  client_validated_at: string | null
  project_id: string
  project: { title: string; status: ProjectStatus; client_id: string }
}

export default async function DeadlinesPage({ searchParams }: PageProps<"/echeances">) {
  const profile = await requireUser()
  const isAdmin = profile.role === "admin"
  const { client } = await searchParams
  const clientId = typeof client === "string" ? client : ""
  const supabase = await createClient()

  // Tâches non terminées des projets en cours (brouillons exclus côté client). La RLS filtre les projets.
  let query = supabase
    .from("tasks")
    .select(
      "id, title, status, priority, deadline, client_validated_at, project_id, project:projects!inner(title, status, client_id)",
    )
    .neq("status", "done")
    .in("project.status", isAdmin ? ["draft", "active", "on_hold"] : ["active", "on_hold"])
  if (clientId) query = query.eq("project.client_id", clientId)

  const [tasks, clients] = await Promise.all([
    read("tasks", query.returns<DueTask[]>()),
    isAdmin ? read("clients", supabase.from("clients").select("id, name, company").order("name")) : Promise.resolve(null),
  ])
  const groups = groupByDeadline(tasks ?? [])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Tous les projets"
        title="Échéances"
        description="Tout ce qui reste à faire, du plus urgent au plus lointain."
        actions={
          clients && (
            <ParamSelect
              param="client"
              value={clientId}
              label="Filtrer par client"
              allLabel="Tous les clients"
              options={clients.map((c) => ({ id: c.id, label: c.company ? `${c.company} — ${c.name}` : c.name }))}
            />
          )
        }
      />

      {groups.length === 0 ? (
        <EmptyState icon={CalendarCheck2} title="Rien à faire" description="Aucune tâche en attente sur les projets en cours." />
      ) : (
        groups.map((group) => (
          <section key={group.key}>
            <h2
              className={cn(
                "mb-3 text-sm font-medium",
                group.key === "overdue" ? "text-red-700 dark:text-red-300" : "text-muted-foreground",
              )}
            >
              {group.title} <span className="font-mono text-xs">· {group.tasks.length}</span>
            </h2>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {group.tasks.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/projects/${task.project_id}?task=${task.id}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-foreground/[0.03] md:grid-cols-[140px_1fr_auto_120px]"
                  >
                    <span className="hidden md:block">
                      <TaskStatusBadge status={task.status} />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{task.title}</span>
                      <span className="truncate text-xs text-muted-foreground">{task.project.title}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {task.client_validated_at && (
                        <CheckCheck className="size-4 text-emerald-700 dark:text-emerald-300" aria-label="Validée" />
                      )}
                      <PriorityBadge priority={task.priority} />
                    </span>
                    <span className="col-span-2 text-xs text-muted-foreground md:col-span-1 md:text-right">
                      {task.deadline ? <span title={formatDate(task.deadline)}>{formatDeadline(task.deadline)}</span> : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
