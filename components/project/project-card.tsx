"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { AlertTriangle, CalendarClock, Check, CheckCircle2, Loader2, RotateCcw } from "lucide-react"

import { useAction } from "@/components/app/use-action"
import { FinancialBadge, HealthBadge, ProgressBar, ProjectStatusLabel } from "@/components/project/status-badges"
import { Button } from "@/components/ui/button"
import { setProjectStatus } from "@/lib/actions/projects"
import { formatDate, formatDeadline } from "@/lib/format"
import type { ProjectOverview } from "@/lib/types"

type ProjectCardProps = {
  project: ProjectOverview
  showClient: boolean
  /** Admin : bouton « Terminer » / « Rouvrir » directement sur la carte. */
  canManage?: boolean
}

export function ProjectCard({ project, showClient, canManage = false }: ProjectCardProps) {
  // Projet clos : la santé et les retards n'ont plus de sens, on affiche le statut.
  const closed = project.status === "completed" || project.status === "archived"

  return (
    <motion.div
      className="relative"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <Link
        href={`/projects/${project.id}`}
        className="flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20"
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
          {closed ? (
            <span className="rounded-full border border-border px-2 py-0.5">
              <ProjectStatusLabel status={project.status} />
            </span>
          ) : (
            <HealthBadge health={project.health} />
          )}
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
            {closed ? formatDate(project.deadline) : formatDeadline(project.next_deadline ?? project.deadline)}
          </span>
          {!closed && project.overdue_tasks > 0 && (
            <span className="inline-flex items-center gap-1.5 text-red-700 dark:text-red-300">
              <AlertTriangle className="size-3.5" />
              {project.overdue_tasks} en retard
            </span>
          )}
          {!closed && project.awaiting_validation > 0 && (
            <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              <CheckCircle2 className="size-3.5" />
              {project.awaiting_validation} à valider
            </span>
          )}
        </div>

        <div className="mt-auto pt-5">
          <FinancialBadge status={project.financial_status} />
        </div>
      </Link>
      {canManage && <StatusButton projectId={project.id} closed={closed} />}
    </motion.div>
  )
}

/** Hors du lien de la carte : un clic ne navigue pas vers le projet. */
function StatusButton({ projectId, closed }: { projectId: string; closed: boolean }) {
  const { pending, run } = useAction()
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        run(() => setProjectStatus(projectId, closed ? "active" : "completed"), {
          success: closed ? "Projet rouvert." : "Projet terminé.",
        })
      }
      className="absolute right-5 bottom-5"
    >
      {pending ? <Loader2 className="animate-spin" /> : closed ? <RotateCcw /> : <Check />}
      {closed ? "Rouvrir" : "Terminer"}
    </Button>
  )
}
