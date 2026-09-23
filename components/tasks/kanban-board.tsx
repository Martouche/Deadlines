"use client"

import { useOptimistic, useState, useTransition } from "react"
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { TaskCard } from "@/components/tasks/task-card"
import { useTaskLink } from "@/components/tasks/use-task-link"
import { Input } from "@/components/ui/input"
import { createTask, moveTask } from "@/lib/actions/tasks"
import { TASK_STATUSES } from "@/lib/constants"
import type { Label, TaskCardData, TaskStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const STEP = 1024

type Move = { id: string; status: TaskStatus; position: number }

type KanbanBoardProps = {
  projectId: string
  tasks: TaskCardData[]
  labels: Map<string, Label>
  isAdmin: boolean
}

/** Position fractionnaire entre les deux voisines : une seule ligne modifiée par déplacement. */
function positionBetween(prev?: TaskCardData, next?: TaskCardData) {
  if (!prev && !next) return STEP
  if (!prev) return next!.position - STEP
  if (!next) return prev.position + STEP
  return (prev.position + next.position) / 2
}

export function KanbanBoard({ projectId, tasks, labels, isAdmin }: KanbanBoardProps) {
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
      const result = await moveTask(draggableId, status, position)
      if (result.error) toast.error(result.error)
    })
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        {TASK_STATUSES.map((s) => {
          const cards = column(s.value)
          return (
            <section key={s.value} className="flex w-72 shrink-0 flex-col rounded-xl border border-white/10 bg-white/[0.02]">
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
                      snapshot.isDraggingOver && "bg-white/[0.03]",
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
                              "rounded-lg border border-white/10 bg-card p-3 transition-colors hover:border-white/20",
                              dragSnapshot.isDragging && "border-white/25 shadow-2xl shadow-black/60",
                            )}
                          >
                            <TaskCard task={task} labels={labels} href={taskLink(task.id)} />
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
  const [pending, startTransition] = useTransition()

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
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
        startTransition(async () => {
          const result = await createTask(projectId, status, title)
          if (result.error) toast.error(result.error)
          else form.reset()
        })
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
