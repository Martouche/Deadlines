"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCheck, Eye, Loader2, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { ConfirmButton } from "@/components/app/confirm-button"
import { PriorityBadge, TaskStatusBadge } from "@/components/project/status-badges"
import { Checklist } from "@/components/tasks/checklist"
import { CommentThread } from "@/components/tasks/comment-thread"
import { Markdown } from "@/components/tasks/markdown"
import { LabelChip } from "@/components/tasks/task-labels"
import { useTaskLink } from "@/components/tasks/use-task-link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { deleteTask, setTaskLabels, updateTask, validateTask, type TaskPatch } from "@/lib/actions/tasks"
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants"
import { formatDate, formatDeadline } from "@/lib/format"
import type { ActionResult, Label, TaskDetail, TaskPriority, TaskStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

type TaskDialogProps = {
  task: TaskDetail
  labels: Label[]
  isAdmin: boolean
  currentUserId: string
}

export function TaskDialog({ task, labels, isAdmin, currentUserId }: TaskDialogProps) {
  const router = useRouter()
  const taskLink = useTaskLink()
  const close = () => router.push(taskLink(null), { scroll: false })

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-4xl">
        <div className="grid md:grid-cols-[1fr_260px]">
          <div className="flex min-w-0 flex-col gap-8 p-6">
            <TaskHeader task={task} isAdmin={isAdmin} />
            <Description task={task} isAdmin={isAdmin} />
            <Checklist taskId={task.id} items={task.checklist} isAdmin={isAdmin} />
            <CommentThread taskId={task.id} comments={task.comments} currentUserId={currentUserId} isAdmin={isAdmin} />
          </div>
          <aside className="flex flex-col gap-6 border-t border-white/10 bg-white/[0.02] p-6 md:border-t-0 md:border-l">
            <Properties task={task} labels={labels} isAdmin={isAdmin} />
            <Validation task={task} isAdmin={isAdmin} />
            {isAdmin && (
              <ConfirmButton
                title="Supprimer cette tâche ?"
                description="Sous-tâches et commentaires seront supprimés aussi."
                confirmLabel="Supprimer"
                onConfirm={async () => {
                  const result = await deleteTask(task.id)
                  if (!result.error) close()
                  return result
                }}
                trigger={
                  <Button variant="ghost" size="sm" className="mt-auto justify-start text-muted-foreground">
                    <Trash2 /> Supprimer la tâche
                  </Button>
                }
              />
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function useTaskUpdate() {
  const [pending, startTransition] = useTransition()
  const run = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const result = await fn()
      if (result.error) toast.error(result.error)
    })
  return { pending, run }
}

function TaskHeader({ task, isAdmin }: { task: TaskDetail; isAdmin: boolean }) {
  const { run } = useTaskUpdate()

  if (!isAdmin) {
    return (
      <div className="pr-8">
        <DialogTitle className="font-heading text-2xl font-semibold tracking-tight">{task.title}</DialogTitle>
        <DialogDescription className="sr-only">Détail de la tâche</DialogDescription>
      </div>
    )
  }

  return (
    <div className="pr-8">
      <DialogTitle className="sr-only">{task.title}</DialogTitle>
      <DialogDescription className="sr-only">Modifier la tâche</DialogDescription>
      <Input
        key={task.title}
        defaultValue={task.title}
        aria-label="Titre"
        onBlur={(e) => {
          const title = e.currentTarget.value.trim()
          if (title && title !== task.title) run(() => updateTask(task.id, { title }))
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="h-auto border-transparent bg-transparent px-0 font-heading text-2xl font-semibold tracking-tight focus-visible:border-transparent focus-visible:ring-0 md:text-2xl dark:bg-transparent"
      />
    </div>
  )
}

function Description({ task, isAdmin }: { task: TaskDetail; isAdmin: boolean }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.description ?? "")
  const { pending, run } = useTaskUpdate()

  if (!isAdmin) {
    return task.description ? <Markdown>{task.description}</Markdown> : null
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">Description</h3>
        <Button variant="ghost" size="xs" onClick={() => setEditing((v) => !v)}>
          {editing ? <Eye /> : <Pencil />}
          {editing ? "Aperçu" : "Modifier"}
        </Button>
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            placeholder="Markdown : **gras**, listes, [liens](https://…), `code`…"
            className="font-mono text-xs"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Annuler
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const result = await updateTask(task.id, { description: draft.trim() || null })
                  if (!result.error) setEditing(false)
                  return result
                })
              }
            >
              {pending && <Loader2 className="animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </div>
      ) : task.description ? (
        <Markdown>{task.description}</Markdown>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full rounded-lg border border-dashed border-white/10 px-3 py-6 text-sm text-muted-foreground transition-colors hover:border-white/20"
        >
          Ajouter une description
        </button>
      )}
    </section>
  )
}

function Properties({ task, labels, isAdmin }: { task: TaskDetail; labels: Label[]; isAdmin: boolean }) {
  const { run } = useTaskUpdate()
  const save = (patch: TaskPatch) => run(() => updateTask(task.id, patch))
  const labelMap = new Map(labels.map((l) => [l.id, l]))

  if (!isAdmin) {
    return (
      <dl className="flex flex-col gap-4 text-sm">
        <Property label="Statut">
          <TaskStatusBadge status={task.status} />
        </Property>
        <Property label="Priorité">
          <PriorityBadge priority={task.priority} />
        </Property>
        <Property label="Échéance">
          {task.deadline ? `${formatDate(task.deadline)} · ${formatDeadline(task.deadline)}` : "—"}
        </Property>
        {task.label_ids.length > 0 && (
          <Property label="Étiquettes">
            <div className="flex flex-wrap gap-1">
              {task.label_ids.map((id) => labelMap.get(id)).filter(Boolean).map((l) => <LabelChip key={l!.id} label={l!} />)}
            </div>
          </Property>
        )}
      </dl>
    )
  }

  const toggleLabel = (id: string) => {
    const next = task.label_ids.includes(id) ? task.label_ids.filter((l) => l !== id) : [...task.label_ids, id]
    run(() => setTaskLabels(task.id, next))
  }

  return (
    <dl className="flex flex-col gap-4 text-sm">
      <Property label="Statut">
        <NativeSelect value={task.status} onChange={(e) => save({ status: e.target.value as TaskStatus })}>
          {TASK_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </NativeSelect>
      </Property>
      <Property label="Priorité">
        <NativeSelect value={task.priority} onChange={(e) => save({ priority: e.target.value as TaskPriority })}>
          {TASK_PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </NativeSelect>
      </Property>
      <Property label="Échéance">
        <Input
          type="date"
          key={task.deadline ?? "none"}
          defaultValue={task.deadline ?? ""}
          onChange={(e) => save({ deadline: e.target.value || null })}
          className="h-9"
        />
      </Property>
      <Property label="Étiquettes">
        <div className="flex flex-wrap gap-1.5">
          {labels.map((l) => {
            const active = task.label_ids.includes(l.id)
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => toggleLabel(l.id)}
                aria-pressed={active}
                className={cn("rounded-full transition-opacity", !active && "opacity-40 hover:opacity-70")}
              >
                <LabelChip label={l} />
              </button>
            )
          })}
        </div>
      </Property>
    </dl>
  )
}

function Property({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Validation({ task, isAdmin }: { task: TaskDetail; isAdmin: boolean }) {
  const { pending, run } = useTaskUpdate()

  if (task.client_validated_at) {
    return (
      <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300">
        <p className="flex items-center gap-1.5 font-medium">
          <CheckCheck className="size-4" /> Validée par le client
        </p>
        <p className="mt-1 text-xs text-emerald-300/80">le {formatDate(task.client_validated_at, "d MMMM yyyy 'à' HH:mm")}</p>
      </div>
    )
  }

  if (task.status !== "review") return null

  if (isAdmin) {
    return (
      <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-300">
        En attente de validation par le client.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3">
      <p className="text-xs text-amber-200">Cette étape attend ta validation.</p>
      <Button disabled={pending} onClick={() => run(() => validateTask(task.id))}>
        {pending ? <Loader2 className="animate-spin" /> : <CheckCheck />}
        Valider cette étape
      </Button>
    </div>
  )
}
