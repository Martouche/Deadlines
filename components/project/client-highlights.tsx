import Link from "next/link"
import { CalendarClock, CheckCircle2, FileText } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { read } from "@/lib/data"
import { formatDate, formatDeadline } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

type TaskRow = { id: string; title: string; deadline: string | null; project_id: string; project: { title: string } }
type DocRow = { id: string; title: string; created_at: string; project_id: string; project: { title: string } }

const OPEN_STATUSES = ["active", "on_hold"]

/** Accueil client : ce qui attend une action de sa part, et les dernières nouveautés. */
export async function ClientHighlights() {
  const supabase = await createClient()
  const [toValidate, upcoming, documents] = await Promise.all([
    read(
      "tasks:a_valider",
      supabase
        .from("tasks")
        .select("id, title, deadline, project_id, project:projects!inner(title, status)")
        .eq("status", "review")
        .is("client_validated_at", null)
        .in("project.status", OPEN_STATUSES)
        .order("deadline", { nullsFirst: false })
        .limit(5)
        .returns<TaskRow[]>(),
    ),
    read(
      "tasks:prochaine_echeance",
      supabase
        .from("tasks")
        .select("id, title, deadline, project_id, project:projects!inner(title, status)")
        .neq("status", "done")
        .not("deadline", "is", null)
        .in("project.status", OPEN_STATUSES)
        .order("deadline")
        .limit(1)
        .returns<TaskRow[]>(),
    ),
    read(
      "project_documents:recents",
      supabase
        .from("project_documents")
        .select("id, title, created_at, project_id, project:projects!inner(title, status)")
        .in("project.status", OPEN_STATUSES)
        .order("created_at", { ascending: false })
        .limit(4)
        .returns<DocRow[]>(),
    ),
  ])

  const next = upcoming?.[0]

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel icon={CheckCircle2} title="En attente de ta validation" highlight={(toValidate ?? []).length > 0}>
        {(toValidate ?? []).length === 0 ? (
          <Empty>Rien à valider pour le moment.</Empty>
        ) : (
          (toValidate ?? []).map((t) => (
            <Row key={t.id} href={`/projects/${t.project_id}?task=${t.id}`} title={t.title} subtitle={t.project.title} />
          ))
        )}
      </Panel>

      <Panel icon={CalendarClock} title="Prochaine échéance">
        {next?.deadline ? (
          <Link href={`/projects/${next.project_id}?task=${next.id}`} className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-foreground/[0.04]">
            <p className="font-heading text-2xl font-semibold tracking-tight">{formatDeadline(next.deadline)}</p>
            <p className="mt-1 truncate text-sm">{next.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {next.project.title} · {formatDate(next.deadline, "d MMMM")}
            </p>
          </Link>
        ) : (
          <Empty>Aucune échéance planifiée.</Empty>
        )}
      </Panel>

      <Panel icon={FileText} title="Derniers livrables">
        {(documents ?? []).length === 0 ? (
          <Empty>Aucun document pour l&apos;instant.</Empty>
        ) : (
          (documents ?? []).map((d) => (
            <Row
              key={d.id}
              href={`/projects/${d.project_id}/documents`}
              title={d.title}
              subtitle={`${d.project.title} · ${formatDate(d.created_at, "d MMM")}`}
            />
          ))
        )}
      </Panel>
    </div>
  )
}

function Panel({ icon: Icon, title, highlight, children }: { icon: LucideIcon; title: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-4",
        highlight ? "border-amber-400/40 bg-amber-400/[0.06]" : "border-border",
      )}
    >
      <h2 className="flex items-center gap-2 px-2 text-sm font-medium text-muted-foreground">
        <Icon className={cn("size-4", highlight && "text-amber-700 dark:text-amber-300")} /> {title}
      </h2>
      <div className="flex flex-col">{children}</div>
    </section>
  )
}

function Row({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <Link href={href} className="rounded-lg px-2 py-1.5 transition-colors hover:bg-foreground/[0.04]">
      <p className="truncate text-sm">{title}</p>
      <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
    </Link>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-2 py-1.5 text-sm text-muted-foreground">{children}</p>
}
