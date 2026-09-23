"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { CalendarRange, Columns3, ListTodo } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { KanbanBoard } from "@/components/tasks/kanban-board"
import { TaskList } from "@/components/tasks/task-list"
import type { Label, TaskCardData } from "@/lib/types"
import { cn } from "@/lib/utils"

export type TasksViewMode = "kanban" | "list"

type TasksViewProps = {
  projectId: string
  tasks: TaskCardData[]
  labels: Label[]
  isAdmin: boolean
  view: TasksViewMode
}

const VIEWS = [
  { value: "kanban", label: "Kanban", icon: Columns3 },
  { value: "list", label: "Échéancier", icon: CalendarRange },
] as const

export function TasksView({ projectId, tasks, labels, isAdmin, view }: TasksViewProps) {
  const labelMap = new Map(labels.map((l) => [l.id, l]))

  return (
    <div className="flex flex-col gap-5">
      <div className="inline-flex w-fit rounded-lg border border-white/10 p-0.5">
        {VIEWS.map((v) => (
          <Link
            key={v.value}
            href={`/projects/${projectId}?view=${v.value}`}
            scroll={false}
            className={cn(
              "relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
              view === v.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {view === v.value && (
              <motion.span
                layoutId="tasks-view-active"
                className="absolute inset-0 rounded-md bg-white/[0.08]"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <v.icon className="relative size-4" />
            <span className="relative">{v.label}</span>
          </Link>
        ))}
      </div>

      {view === "kanban" ? (
        <KanbanBoard projectId={projectId} tasks={tasks} labels={labelMap} isAdmin={isAdmin} />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Aucune tâche"
          description={isAdmin ? "Ajoute des tâches depuis la vue Kanban." : "Les étapes du projet apparaîtront ici."}
        />
      ) : (
        <TaskList tasks={tasks} labels={labelMap} />
      )}
    </div>
  )
}
