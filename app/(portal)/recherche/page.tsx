import type { Metadata } from "next"
import Link from "next/link"
import { FileText, FolderKanban, ListTodo, SearchX, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { ProjectStatusLabel, TaskStatusBadge } from "@/components/project/status-badges"
import { requireUser } from "@/lib/auth"
import { read } from "@/lib/data"
import { createClient } from "@/lib/supabase/server"
import type { ProjectStatus, TaskStatus } from "@/lib/types"

export const metadata: Metadata = { title: "Recherche" }

type Hit = { id: string; href: string; title: string; subtitle?: string | null; meta?: React.ReactNode }

export default async function SearchPage({ searchParams }: PageProps<"/recherche">) {
  const profile = await requireUser()
  const isAdmin = profile.role === "admin"
  const { q } = await searchParams
  const query = typeof q === "string" ? q.trim() : ""
  // Caractères réservés de la syntaxe de filtre PostgREST retirés.
  const term = query.replace(/[,()*%\\]/g, " ").trim()

  if (!term) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Recherche" />
        <EmptyState icon={SearchX} title="Tape un mot-clé" description="Projets, tâches, documents et clients." />
      </div>
    )
  }

  const supabase = await createClient()
  const like = `%${term}%`
  // La RLS limite chaque requête à ce que l'utilisateur peut voir.
  const [projects, tasks, documents, clients] = await Promise.all([
    read(
      "projects",
      supabase
        .from("projects")
        .select("id, title, status")
        .ilike("title", like)
        .limit(20)
        .returns<{ id: string; title: string; status: ProjectStatus }[]>(),
    ),
    read(
      "tasks",
      supabase
        .from("tasks")
        .select("id, title, status, project_id, project:projects!inner(title, status)")
        .ilike("title", like)
        .limit(30)
        .returns<{ id: string; title: string; status: TaskStatus; project_id: string; project: { title: string; status: ProjectStatus } }[]>(),
    ),
    read(
      "project_documents",
      supabase
        .from("project_documents")
        .select("id, title, project_id, project:projects!inner(title, status)")
        .ilike("title", like)
        .limit(20)
        .returns<{ id: string; title: string; project_id: string; project: { title: string; status: ProjectStatus } }[]>(),
    ),
    isAdmin
      ? read(
          "clients",
          supabase
            .from("clients")
            .select("id, name, company, email")
            .or(`name.ilike.*${term}*,company.ilike.*${term}*,email.ilike.*${term}*`)
            .limit(20),
        )
      : Promise.resolve(null),
  ])

  // Un client ne voit pas les brouillons.
  const visible = (status: ProjectStatus) => isAdmin || status !== "draft"

  const sections: { title: string; icon: LucideIcon; hits: Hit[] }[] = [
    {
      title: "Projets",
      icon: FolderKanban,
      hits: (projects ?? [])
        .filter((p) => visible(p.status))
        .map((p) => ({ id: p.id, href: `/projects/${p.id}`, title: p.title, meta: <ProjectStatusLabel status={p.status} /> })),
    },
    {
      title: "Tâches",
      icon: ListTodo,
      hits: (tasks ?? [])
        .filter((t) => visible(t.project.status))
        .map((t) => ({
          id: t.id,
          href: `/projects/${t.project_id}?task=${t.id}`,
          title: t.title,
          subtitle: t.project.title,
          meta: <TaskStatusBadge status={t.status} />,
        })),
    },
    {
      title: "Documents",
      icon: FileText,
      hits: (documents ?? [])
        .filter((d) => visible(d.project.status))
        .map((d) => ({ id: d.id, href: `/projects/${d.project_id}/documents`, title: d.title, subtitle: d.project.title })),
    },
    {
      title: "Clients",
      icon: Users,
      hits: (clients ?? []).map((c) => ({
        id: c.id,
        href: `/admin/clients/${c.id}`,
        title: c.company ? `${c.company} — ${c.name}` : c.name,
        subtitle: c.email,
      })),
    },
  ].filter((s) => s.hits.length > 0)

  const total = sections.reduce((n, s) => n + s.hits.length, 0)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={`${total} résultat${total > 1 ? "s" : ""}`} title={`« ${query} »`} />
      {sections.length === 0 ? (
        <EmptyState icon={SearchX} title="Aucun résultat" description="Essaie un autre mot-clé." />
      ) : (
        sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <section.icon className="size-4" /> {section.title}
              <span className="font-mono text-xs">· {section.hits.length}</span>
            </h2>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {section.hits.map((hit) => (
                <li key={hit.id}>
                  <Link
                    href={hit.href}
                    className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-foreground/[0.03]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{hit.title}</span>
                      {hit.subtitle && <span className="block truncate text-xs text-muted-foreground">{hit.subtitle}</span>}
                    </span>
                    {hit.meta}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
