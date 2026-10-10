"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { CalendarRange, Columns3, Eye, EyeOff, ListTodo } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { KanbanBoard } from "@/components/tasks/kanban-board"
import { TaskList } from "@/components/tasks/task-list"
import { springs } from "@/lib/motion-tokens"
import type { Label, TaskCardData } from "@/lib/types"
import { cn } from "@/lib/utils"

export type TasksViewMode = "kanban" | "list"

type TasksViewProps = {
  projectId: string
  tasks: TaskCardData[]
  labels: Label[]
  isAdmin: boolean
  view: TasksViewMode
  hideDone: boolean
}

const VIEWS = [
  { value: "kanban", label: "Kanban", icon: Columns3 },
  { value: "list", label: "Échéancier", icon: CalendarRange },
] as const

export function TasksView({ projectId, tasks, labels, isAdmin, view, hideDone }: TasksViewProps) {
  const labelMap = new Map(labels.map((l) => [l.id, l]))
  const visible = hideDone ? tasks.filter((t) => t.status !== "done") : tasks
  const doneCount = tasks.length - tasks.filter((t) => t.status !== "done").length

  const href = (next: { view?: TasksViewMode; hideDone?: boolean }) => {
    const params = new URLSearchParams()
    params.set("view", next.view ?? view)
    if (next.hideDone ?? hideDone) params.set("terminees", "masquees")
    return `/projects/${projectId}?${params}`
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex w-fit rounded-lg border border-border p-0.5">
          {VIEWS.map((v) => (
            <Link
              key={v.value}
              href={href({ view: v.value })}
              scroll={false}
              className={cn(
                "relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                view === v.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {view === v.value && (
                <motion.span
                  layoutId="tasks-view-active"
                  className="absolute inset-0 rounded-md bg-foreground/[0.08]"
                  transition={springs.snappy}
                />
              )}
              <v.icon className="relative size-4" />
              <span className="relative">{v.label}</span>
            </Link>
          ))}
        </div>

        <Link
          href={href({ hideDone: !hideDone })}
          scroll={false}
          aria-pressed={hideDone}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
            hideDone
              ? "border-foreground/25 bg-foreground/[0.06] text-foreground"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {hideDone ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {hideDone ? "Terminées masquées" : "Masquer les terminées"}
          <span className="font-mono text-xs text-muted-foreground">{doneCount}</span>
        </Link>
      </div>

      {view === "kanban" ? (
        <KanbanBoard projectId={projectId} tasks={visible} labels={labelMap} isAdmin={isAdmin} hideDone={hideDone} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={tasks.length === 0 ? "Aucune tâche" : "Tout est terminé"}
          description={
            tasks.length > 0
              ? "Affiche les tâches terminées pour les revoir."
              : isAdmin
                ? "Ajoute des tâches depuis la vue Kanban."
                : "Les étapes du projet apparaîtront ici."
          }
        />
      ) : (
        <TaskList tasks={visible} labels={labelMap} />
      )}
    </div>
  )
}
