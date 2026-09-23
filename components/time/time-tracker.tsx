"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { format } from "date-fns"
import { Loader2, Play, Square, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { ConfirmButton } from "@/components/app/confirm-button"
import { Field } from "@/components/app/field"
import { SubmitButton } from "@/components/app/submit-button"
import { useFormAction } from "@/components/app/use-form-action"
import { FormMessage } from "@/components/auth/form-message"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { addManualEntry, deleteTimeEntry, startTimer, stopTimer } from "@/lib/actions/time"
import { formatDate, formatMinutes } from "@/lib/format"
import type { TimeEntry } from "@/lib/types"

type TaskOption = { id: string; title: string }

export function Timer({ projectId, tasks, running }: { projectId: string; tasks: TaskOption[]; running: TimeEntry | null }) {
  const [pending, startTransition] = useTransition()
  const [taskId, setTaskId] = useState("")
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])

  const elapsed = running ? Math.max(0, Math.floor((now - new Date(running.started_at).getTime()) / 1000)) : 0
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0")
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")
  const ss = String(elapsed % 60).padStart(2, "0")

  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await fn()
      if (result.error) toast.error(result.error)
    })

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 p-5">
      <span className="font-mono text-3xl tabular-nums">
        {hh}:{mm}:{ss}
      </span>
      {running ? (
        <>
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {running.task?.title ?? "Temps général du projet"}
          </span>
          <Button size="lg" variant="destructive" disabled={pending} onClick={() => run(() => stopTimer(running.id))}>
            {pending ? <Loader2 className="animate-spin" /> : <Square />} Arrêter
          </Button>
        </>
      ) : (
        <>
          <div className="min-w-48 flex-1">
            <NativeSelect value={taskId} onChange={(e) => setTaskId(e.target.value)} aria-label="Tâche">
              <option value="">Temps général du projet</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button size="lg" disabled={pending} onClick={() => run(() => startTimer(projectId, taskId || null))}>
            {pending ? <Loader2 className="animate-spin" /> : <Play />} Démarrer
          </Button>
        </>
      )}
    </div>
  )
}

export function ManualEntryForm({ projectId, tasks }: { projectId: string; tasks: TaskOption[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action] = useFormAction(addManualEntry.bind(null, projectId), "Temps ajouté.", () =>
    formRef.current?.reset(),
  )

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <Field label="Tâche" htmlFor="entry-task">
        <NativeSelect id="entry-task" name="task_id" defaultValue="">
          <option value="">Temps général du projet</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Date" htmlFor="entry-date">
          <Input id="entry-date" name="date" type="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} className="h-9" />
        </Field>
        <Field label="Heures" htmlFor="entry-hours">
          <Input id="entry-hours" name="hours" type="number" min={0} step={1} placeholder="0" className="h-9" />
        </Field>
        <Field label="Minutes" htmlFor="entry-minutes">
          <Input id="entry-minutes" name="minutes" type="number" min={0} max={59} step={5} placeholder="0" className="h-9" />
        </Field>
      </div>
      <Field label="Note" htmlFor="entry-note">
        <Input id="entry-note" name="note" className="h-9" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="billable" defaultChecked className="size-4 accent-foreground" />
        Facturable
      </label>
      <FormMessage tone="error" message={state.error} />
      <div>
        <SubmitButton variant="outline">Ajouter</SubmitButton>
      </div>
    </form>
  )
}

export function EntryList({ entries }: { entries: TimeEntry[] }) {
  if (entries.length === 0) {
    return <p className="rounded-xl border border-white/10 px-4 py-6 text-center text-sm text-muted-foreground">Aucun temps saisi.</p>
  }

  return (
    <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{e.task?.title ?? "Temps général"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {formatDate(e.started_at, "EEE d MMM")}
              {e.note && ` · ${e.note}`}
              {!e.billable && " · non facturable"}
            </p>
          </div>
          <span className="font-mono text-sm">{e.ended_at ? formatMinutes(e.minutes ?? 0) : "en cours…"}</span>
          <ConfirmButton
            title="Supprimer cette entrée ?"
            description="Le temps sera retiré du suivi."
            confirmLabel="Supprimer"
            onConfirm={() => deleteTimeEntry(e.id)}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Supprimer">
                <Trash2 />
              </Button>
            }
          />
        </li>
      ))}
    </ul>
  )
}
