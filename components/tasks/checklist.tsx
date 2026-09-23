"use client"

import { useTransition } from "react"
import { Check, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from "@/lib/actions/tasks"
import type { ActionResult, ChecklistItem } from "@/lib/types"
import { cn } from "@/lib/utils"

export function Checklist({ taskId, items, isAdmin }: { taskId: string; items: ChecklistItem[]; isAdmin: boolean }) {
  const [pending, startTransition] = useTransition()
  const done = items.filter((i) => i.is_done).length

  const run = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const result = await fn()
      if (result.error) toast.error(result.error)
    })

  if (!isAdmin && items.length === 0) return null

  return (
    <section>
      <h3 className="mb-2 flex items-center justify-between text-sm font-medium">
        Sous-tâches
        {items.length > 0 && (
          <span className="font-mono text-xs text-muted-foreground">
            {done}/{items.length}
          </span>
        )}
      </h3>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-2 rounded-md py-1">
            <button
              type="button"
              disabled={!isAdmin || pending}
              onClick={() => run(() => toggleChecklistItem(item.id, !item.is_done))}
              aria-label={item.is_done ? "Marquer comme à faire" : "Marquer comme fait"}
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                item.is_done ? "border-emerald-400 bg-emerald-400 text-black" : "border-white/25",
                isAdmin && "hover:border-white/50",
              )}
            >
              {item.is_done && <Check className="size-3" strokeWidth={3} />}
            </button>
            <span className={cn("flex-1 text-sm", item.is_done && "text-muted-foreground line-through")}>{item.title}</span>
            {isAdmin && (
              <button
                type="button"
                onClick={() => run(() => deleteChecklistItem(item.id))}
                aria-label="Supprimer"
                className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {isAdmin && (
        <form
          className="mt-2 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const form = e.currentTarget
            const title = String(new FormData(form).get("title") ?? "")
            run(async () => {
              const result = await addChecklistItem(taskId, title)
              if (!result.error) form.reset()
              return result
            })
          }}
        >
          <Plus className="size-4 text-muted-foreground" />
          <Input name="title" placeholder="Ajouter une sous-tâche" disabled={pending} className="h-8 border-transparent bg-transparent px-1 dark:bg-transparent" />
        </form>
      )}
    </section>
  )
}
