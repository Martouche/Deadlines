import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { EntryList, ManualEntryForm, Timer } from "@/components/time/time-tracker"
import { formatMinutes, formatMoney } from "@/lib/format"
import { getProject } from "@/lib/projects"
import { createClient } from "@/lib/supabase/server"
import type { TimeEntry } from "@/lib/types"

export const metadata: Metadata = { title: "Gestion du temps" }

export default async function TimePage({ params }: PageProps<"/projects/[projectId]/time">) {
  const { projectId } = await params
  const { project, isAdmin } = await getProject(projectId)
  if (!isAdmin) notFound()

  const supabase = await createClient()
  const [{ data: entries }, { data: tasks }] = await Promise.all([
    supabase
      .from("time_entries")
      .select("id, task_id, started_at, ended_at, minutes, note, billable, task:tasks(title)")
      .eq("project_id", projectId)
      .order("started_at", { ascending: false })
      .returns<TimeEntry[]>(),
    supabase.from("tasks").select("id, title").eq("project_id", projectId).order("title"),
  ])

  const all = entries ?? []
  const running = all.find((e) => !e.ended_at) ?? null
  const done = all.filter((e) => e.ended_at)
  const total = done.reduce((s, e) => s + (e.minutes ?? 0), 0)
  const billable = done.filter((e) => e.billable).reduce((s, e) => s + (e.minutes ?? 0), 0)
  const rate = project.budget_cents && total > 0 ? Math.round(project.budget_cents / (total / 60)) : null

  const byTask = new Map<string, { title: string; minutes: number }>()
  for (const e of done) {
    const key = e.task_id ?? "general"
    const current = byTask.get(key) ?? { title: e.task?.title ?? "Temps général", minutes: 0 }
    byTask.set(key, { ...current, minutes: current.minutes + (e.minutes ?? 0) })
  }
  const breakdown = [...byTask.values()].sort((a, b) => b.minutes - a.minutes)

  const stats = [
    { label: "Temps total", value: formatMinutes(total) },
    { label: "Facturable", value: formatMinutes(billable) },
    { label: "Budget", value: formatMoney(project.budget_cents, project.currency) },
    { label: "Taux horaire effectif", value: rate ? `${formatMoney(rate, project.currency)}/h` : "—" },
  ]

  return (
    <div className="flex flex-col gap-8">
      <Timer projectId={projectId} tasks={tasks ?? []} running={running} />

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-background p-5">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="mt-2 font-heading text-2xl font-semibold tracking-tight">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-8">
          {breakdown.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">Par tâche</h2>
              <ul className="flex flex-col gap-3">
                {breakdown.map((b) => (
                  <li key={b.title} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="truncate">{b.title}</span>
                      <span className="font-mono text-muted-foreground">{formatMinutes(b.minutes)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-foreground/70" style={{ width: `${(b.minutes / total) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Historique</h2>
            <EntryList entries={all} />
          </section>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Saisie manuelle</h2>
          <div className="rounded-xl border border-white/10 p-5">
            <ManualEntryForm projectId={projectId} tasks={tasks ?? []} />
          </div>
        </section>
      </div>
    </div>
  )
}
