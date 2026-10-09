import { format, parseISO } from "date-fns"

import { getProfile } from "@/lib/auth"
import { describeError, logEvent, newRef } from "@/lib/logger"
import { createClient } from "@/lib/supabase/server"

type Row = {
  started_at: string
  minutes: number | null
  note: string | null
  billable: boolean
  task: { title: string } | null
}

/** Échappe une cellule CSV (séparateur « ; », guillemets doublés). */
function cell(value: string) {
  return /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Export du temps passé d'un projet, prêt pour Excel (UTF-8 avec BOM, séparateur « ; »). */
export async function GET(_request: Request, { params }: RouteContext<"/projects/[projectId]/time/export">) {
  const { projectId } = await params
  const ref = newRef()

  const profile = await getProfile()
  if (profile?.role !== "admin") return new Response("Accès réservé à l'administrateur.", { status: 403 })

  const supabase = await createClient()
  const [project, entries] = await Promise.all([
    supabase.from("projects").select("title").eq("id", projectId).maybeSingle(),
    supabase
      .from("time_entries")
      .select("started_at, minutes, note, billable, task:tasks(title)")
      .eq("project_id", projectId)
      .not("ended_at", "is", null)
      .order("started_at")
      .returns<Row[]>(),
  ])

  const error = project.error ?? entries.error
  if (error || !project.data) {
    await logEvent({ level: "error", action: "time.export", ref, context: { projectId }, error: error ? describeError(error) : "Projet introuvable" })
    return new Response(`Export impossible (réf. ${ref}).`, { status: error ? 500 : 404 })
  }

  const rows = entries.data ?? []
  const lines = [
    ["Date", "Tâche", "Durée (min)", "Heures", "Facturable", "Note"].join(";"),
    ...rows.map((e) =>
      [
        format(parseISO(e.started_at), "dd/MM/yyyy"),
        cell(e.task?.title ?? "Temps général"),
        String(e.minutes ?? 0),
        ((e.minutes ?? 0) / 60).toFixed(2).replace(".", ","),
        e.billable ? "oui" : "non",
        cell(e.note ?? ""),
      ].join(";"),
    ),
  ]

  const slug = project.data.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w-]+/g, "-").toLowerCase()
  await logEvent({ level: "info", action: "time.export", ref, context: { projectId, rows: rows.length } })

  return new Response("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="temps-${slug}-${format(new Date(), "yyyy-MM-dd")}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
