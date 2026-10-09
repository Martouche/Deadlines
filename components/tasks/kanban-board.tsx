"use client"

import { useOptimistic, useState, useTransition } from "react"
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { useAction } from "@/components/app/use-action"
import { TaskCard } from "@/components/tasks/task-card"
import { useTaskLink } from "@/components/tasks/use-task-link"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { createTask, moveTask, updateTask } from "@/lib/actions/tasks"
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants"
import type { Label, TaskCardData, TaskPriority, TaskStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const STEP = 1024

type Move = { id: string; status: TaskStatus; position: number }

type KanbanBoardProps = {
  projectId: string
  tasks: TaskCardData[]
  labels: Map<string, Label>
  isAdmin: boolean
  /** Colonne « Terminé » masquée. */
  hideDone: boolean
}

/** Position fractionnaire entre les deux voisines : une seule ligne modifiée par déplacement. */
function positionBetween(prev?: TaskCardData, next?: TaskCardData) {
  if (!prev && !next) return STEP
  if (!prev) return next!.position - STEP
  if (!next) return prev.position + STEP
  return (prev.position + next.position) / 2
}

export function KanbanBoard({ projectId, tasks, labels, isAdmin, hideDone }: KanbanBoardProps) {
  const taskLink = useTaskLink()
  const [, startTransition] = useTransition()
  const [items, applyMove] = useOptimistic(tasks, (state, move: Move) =>
    state.map((t) => (t.id === move.id ? { ...t, status: move.status, position: move.position } : t)),
  )

  const column = (status: TaskStatus) =>
    items.filter((t) => t.status === status).sort((a, b) => a.position - b.position)

  const onDragEnd = ({ draggableId, source, destination }: DropResult) => {
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const status = destination.droppableId as TaskStatus
    const target = column(status).filter((t) => t.id !== draggableId)
    const position = positionBetween(target[destination.index - 1], target[destination.index])

    startTransition(async () => {
      applyMove({ id: draggableId, status, position })
      try {
        const result = await moveTask(draggableId, status, position)
        // En cas d'échec, l'état optimiste est abandonné : la carte revient à sa place.
        if (result.error) toast.error(result.error)
      } catch (error) {
        console.error("[action] tasks.move", error)
        toast.error("Le serveur n'a pas répondu : déplacement annulé.")
      }
    })
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        {TASK_STATUSES.filter((s) => !hideDone || s.value !== "done").map((s) => {
          const cards = column(s.value)
          return (
            <section key={s.value} className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-foreground/[0.02]">
              <header className="flex items-center gap-2 px-3 pt-3 pb-2">
                <span className={cn("size-2 rounded-full", s.className)} />
                <h3 className="text-sm font-medium">{s.label}</h3>
                <span className="ml-auto font-mono text-xs text-muted-foreground">{cards.length}</span>
              </header>

              <Droppable droppableId={s.value}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex min-h-24 flex-1 flex-col gap-2 rounded-b-xl px-2 pb-2 transition-colors",
                      snapshot.isDraggingOver && "bg-foreground/[0.03]",
                    )}
                  >
                    {cards.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!isAdmin}>
                        {(drag, dragSnapshot) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            {...drag.dragHandleProps}
                            className={cn(
                              "group rounded-lg border border-border bg-card p-3 transition-colors hover:border-foreground/20",
                              dragSnapshot.isDragging && "border-foreground/25 shadow-2xl shadow-black/20 dark:shadow-black/60",
                            )}
                          >
                            <TaskCard task={task} labels={labels} href={taskLink(task.id)} />
                            {isAdmin && <QuickEdit task={task} />}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {isAdmin && <QuickAdd projectId={projectId} status={s.value} />}
                  </div>
                )}
              </Droppable>
            </section>
          )
        })}
      </div>
    </DragDropContext>
  )
}

function QuickAdd({ projectId, status }: { projectId: string; status: TaskStatus }) {
  const [open, setOpen] = useState(false)
  const { pending, run } = useAction()

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
      >
        <Plus className="size-3.5" /> Ajouter une tâche
      </button>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const title = String(new FormData(form).get("title") ?? "")
        run(() => createTask(projectId, status, title), { onSuccess: () => form.reset() })
      }}
    >
      <Input
        name="title"
        autoFocus
        disabled={pending}
        placeholder="Titre, puis Entrée"
        onBlur={(e) => !e.currentTarget.value && setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="h-8 text-sm"
      />
    </form>
  )
}

/**
 * Priorité et échéance modifiables sans ouvrir la fiche. Visibles au survol ou au
 * clavier (focus) ; les champs de formulaire ne déclenchent pas le glisser-déposer.
 */
function QuickEdit({ task }: { task: TaskCardData }) {
  const { pending, run } = useAction()

  return (
    <div className="grid max-h-0 grid-cols-2 gap-1.5 overflow-hidden opacity-0 transition-all group-focus-within:mt-2 group-focus-within:max-h-10 group-focus-within:opacity-100 group-hover:mt-2 group-hover:max-h-10 group-hover:opacity-100 max-md:mt-2 max-md:max-h-10 max-md:opacity-100">
      <NativeSelect
        aria-label="Priorité"
        value={task.priority}
        disabled={pending}
        onChange={(e) => run(() => updateTask(task.id, { priority: e.target.value as TaskPriority }))}
        className="h-7 pr-6 pl-2 text-xs"
      >
        {TASK_PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </NativeSelect>
      <Input
        type="date"
        aria-label="Échéance"
        key={task.deadline ?? "aucune"}
        defaultValue={task.deadline ?? ""}
        disabled={pending}
        onChange={(e) => run(() => updateTask(task.id, { deadline: e.target.value || null }))}
        className="h-7 px-2 text-xs"
      />
    </div>
  )
}
