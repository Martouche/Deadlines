import { daysUntil } from "@/lib/format"
import type { TaskStatus } from "@/lib/types"

export type DeadlineGroup<T> = { key: string; title: string; tasks: T[] }

/** Regroupe des tâches par échéance (en retard, cette semaine, ce mois…), triées par date. */
export function groupByDeadline<T extends { status: TaskStatus; deadline: string | null }>(tasks: T[]): DeadlineGroup<T>[] {
  const groups: DeadlineGroup<T>[] = [
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
