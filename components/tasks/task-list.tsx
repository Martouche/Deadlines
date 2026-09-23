"use client"

import Link from "next/link"
import { CheckCheck } from "lucide-react"

import { PriorityBadge, TaskStatusBadge } from "@/components/project/status-badges"
import { LabelList } from "@/components/tasks/task-labels"
import { useTaskLink } from "@/components/tasks/use-task-link"
import { daysUntil, formatDate, formatDeadline } from "@/lib/format"
import type { Label, TaskCardData } from "@/lib/types"
import { cn } from "@/lib/utils"

type Group = { key: string; title: string; tasks: TaskCardData[] }

/** Vue « timeline » : tâches regroupées par échéance. */
function groupByDeadline(tasks: TaskCardData[]): Group[] {
  const groups: Group[] = [
    { key: "overdue", title: "En retard", tasks: [] },
    { key: "week", title: "Cette semaine", tasks: [] },
    { key: "month", title: "Dans le mois", tasks: [] },
    { key: "later", title: "Plus tard", tasks: [] },
    { key: "none", title: "Sans échéance", tasks: [] },
    { key: "done", title: "Terminées", tasks: [] },
  ]
  const byKey = new Map(groups.map((g) => [g.key, g]))
  const sorted = [...tasks].sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"))

  for (const task of sorted) {
    let key = "none"
    if (task.status === "done") key = "done"
    else if (task.deadline) {
      const days = daysUntil(task.deadline)
      key = days < 0 ? "overdue" : days <= 7 ? "week" : days <= 31 ? "month" : "later"
    }
    byKey.get(key)!.tasks.push(task)
  }
  return groups.filter((g) => g.tasks.length > 0)
}

export function TaskList({ tasks, labels }: { tasks: TaskCardData[]; labels: Map<string, Label> }) {
  const taskLink = useTaskLink()

  return (
    <div className="flex flex-col gap-8">
      {groupByDeadline(tasks).map((group) => (
        <section key={group.key}>
          <h3 className={cn("mb-3 text-sm font-medium", group.key === "overdue" ? "text-red-300" : "text-muted-foreground")}>
            {group.title} <span className="font-mono text-xs">· {group.tasks.length}</span>
          </h3>
          <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
            {group.tasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={taskLink(task.id)}
                  scroll={false}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-white/[0.03] md:grid-cols-[140px_1fr_auto_120px]"
                >
                  <span className="hidden md:block">
                    <TaskStatusBadge status={task.status} />
                  </span>
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span className={cn("truncate text-sm", task.status === "done" && "text-muted-foreground line-through")}>
                      {task.title}
                    </span>
                    <LabelList ids={task.label_ids} labels={labels} />
                  </span>
                  <span className="flex items-center gap-2">
                    {task.client_validated_at && <CheckCheck className="size-4 text-emerald-300" aria-label="Validée" />}
                    <PriorityBadge priority={task.priority} />
                  </span>
                  <span className="col-span-2 text-xs text-muted-foreground md:col-span-1 md:text-right">
                    {task.deadline ? (
                      <span title={formatDate(task.deadline)}>{formatDeadline(task.deadline)}</span>
                    ) : (
                      "—"
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
