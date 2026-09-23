import Link from "next/link"
import { CalendarClock, CheckCheck, ListChecks, MessageSquare } from "lucide-react"

import { PriorityBadge } from "@/components/project/status-badges"
import { LabelList } from "@/components/tasks/task-labels"
import { daysUntil, formatDeadline } from "@/lib/format"
import type { Label, TaskCardData } from "@/lib/types"
import { cn } from "@/lib/utils"

type TaskCardProps = {
  task: TaskCardData
  labels: Map<string, Label>
  href: string
}

export function TaskCard({ task, labels, href }: TaskCardProps) {
  const overdue = task.deadline && task.status !== "done" && daysUntil(task.deadline) < 0

  return (
    <Link href={href} scroll={false} className="block">
      <p className="text-sm leading-snug font-medium">{task.title}</p>
      {task.label_ids.length > 0 && (
        <div className="mt-2">
          <LabelList ids={task.label_ids} labels={labels} />
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
        {task.priority !== "medium" && <PriorityBadge priority={task.priority} />}
        {task.deadline && (
          <span className={cn("inline-flex items-center gap-1", overdue && "text-red-300")}>
            <CalendarClock className="size-3" />
            {formatDeadline(task.deadline)}
          </span>
        )}
        {task.checklist_total > 0 && (
          <span className="inline-flex items-center gap-1">
            <ListChecks className="size-3" />
            {task.checklist_done}/{task.checklist_total}
          </span>
        )}
        {task.comment_count > 0 && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3" />
            {task.comment_count}
          </span>
        )}
        {task.client_validated_at && (
          <span className="inline-flex items-center gap-1 text-emerald-300">
            <CheckCheck className="size-3" />
            Validée
          </span>
        )}
      </div>
    </Link>
  )
}
