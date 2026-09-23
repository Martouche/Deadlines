import { FINANCIAL_STATUSES, HEALTH, PROJECT_STATUSES, TASK_PRIORITIES, TASK_STATUSES, optionOf } from "@/lib/constants"
import type { FinancialStatus, ProjectHealth, ProjectStatus, TaskPriority, TaskStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const pill = "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap"

export function FinancialBadge({ status }: { status: FinancialStatus }) {
  const o = optionOf(FINANCIAL_STATUSES, status)
  return <span className={cn(pill, o.className)}>{o.label}</span>
}

export function HealthBadge({ health }: { health: ProjectHealth }) {
  const o = optionOf(HEALTH, health)
  return (
    <span className={cn(pill, "border-white/10 text-zinc-300")}>
      <span className={cn("size-1.5 rounded-full", o.className)} />
      {o.label}
    </span>
  )
}

export function ProjectStatusLabel({ status }: { status: ProjectStatus }) {
  const o = optionOf(PROJECT_STATUSES, status)
  return <span className={cn("text-xs font-medium", o.className)}>{o.label}</span>
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const o = optionOf(TASK_PRIORITIES, priority)
  return <span className={cn(pill, "px-1.5", o.className)}>{o.label}</span>
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const o = optionOf(TASK_STATUSES, status)
  return (
    <span className={cn(pill, "border-white/10 text-zinc-300")}>
      <span className={cn("size-1.5 rounded-full", o.className)} />
      {o.label}
    </span>
  )
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]", className)}
    >
      <div className="h-full rounded-full bg-foreground transition-[width]" style={{ width: `${value}%` }} />
    </div>
  )
}
