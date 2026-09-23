"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react"

import { FinancialBadge, HealthBadge, ProgressBar } from "@/components/project/status-badges"
import { formatDeadline } from "@/lib/format"
import type { ProjectOverview } from "@/lib/types"

export function ProjectCard({ project, showClient }: { project: ProjectOverview; showClient: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <Link
        href={`/projects/${project.id}`}
        className="flex h-full flex-col rounded-xl border border-white/10 bg-card p-5 transition-colors hover:border-white/20"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {showClient && (
              <p className="truncate text-xs text-muted-foreground">
                {project.client_company || project.client_name}
              </p>
            )}
            <h3 className="mt-1 truncate font-heading text-lg font-semibold tracking-tight">{project.title}</h3>
          </div>
          <HealthBadge health={project.health} />
        </div>

        <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {project.tasks_done}/{project.tasks_total} tâches
          </span>
          <span className="font-mono text-foreground">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} className="mt-2" />

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-3.5" />
            {formatDeadline(project.next_deadline ?? project.deadline)}
          </span>
          {project.overdue_tasks > 0 && (
            <span className="inline-flex items-center gap-1.5 text-red-300">
              <AlertTriangle className="size-3.5" />
              {project.overdue_tasks} en retard
            </span>
          )}
          {project.awaiting_validation > 0 && (
            <span className="inline-flex items-center gap-1.5 text-amber-300">
              <CheckCircle2 className="size-3.5" />
              {project.awaiting_validation} à valider
            </span>
          )}
        </div>

        <div className="mt-auto pt-5">
          <FinancialBadge status={project.financial_status} />
        </div>
      </Link>
    </motion.div>
  )
}
