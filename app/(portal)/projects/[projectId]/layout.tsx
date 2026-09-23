import { CalendarClock, Wallet } from "lucide-react"

import { ProjectTabs } from "@/components/project/project-tabs"
import { FinancialBadge, HealthBadge, ProgressBar, ProjectStatusLabel } from "@/components/project/status-badges"
import { formatDate, formatDeadline, formatMoney } from "@/lib/format"
import { getProject } from "@/lib/projects"

export default async function ProjectLayout({ children, params }: LayoutProps<"/projects/[projectId]">) {
  const { projectId } = await params
  const { project, isAdmin } = await getProject(projectId)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              {isAdmin ? project.client_company || project.client_name : "Projet"}
            </p>
            <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{project.title}</h1>
            {project.description && (
              <p className="mt-2 max-w-3xl text-sm whitespace-pre-line text-muted-foreground">{project.description}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HealthBadge health={project.health} />
            <FinancialBadge status={project.financial_status} />
          </div>
        </div>

        <div className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3">
          <div className="bg-background p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Avancement</span>
              <span className="font-mono text-foreground">{project.progress}%</span>
            </div>
            <ProgressBar value={project.progress} className="mt-3" />
            <p className="mt-2 text-xs text-muted-foreground">
              {project.tasks_done} / {project.tasks_total} tâches terminées
            </p>
          </div>
          <div className="bg-background p-4">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" /> Deadline finale
            </p>
            <p className="mt-2 font-heading text-xl font-semibold">{formatDate(project.deadline, "d MMMM yyyy")}</p>
            {project.deadline && <p className="text-xs text-muted-foreground">{formatDeadline(project.deadline)}</p>}
          </div>
          <div className="bg-background p-4">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="size-3.5" /> Budget
            </p>
            <p className="mt-2 font-heading text-xl font-semibold">{formatMoney(project.budget_cents, project.currency)}</p>
            <ProjectStatusLabel status={project.status} />
          </div>
        </div>

        <ProjectTabs projectId={project.id} isAdmin={isAdmin} />
      </header>

      {children}
    </div>
  )
}
