import type { Metadata } from "next"
import Link from "next/link"
import { FolderKanban, Plus, SearchX } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { ProjectCard } from "@/components/project/project-card"
import { ProjectFilters } from "@/components/project/project-filters"
import { buttonVariants } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"
import { PROJECT_VIEWS, matchesView, parseProjectQuery, sortProjects, type ProjectView } from "@/lib/project-views"
import { createClient } from "@/lib/supabase/server"
import type { ProjectOverview } from "@/lib/types"

export const metadata: Metadata = { title: "Projets" }

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const profile = await requireUser()
  const isAdmin = profile.role === "admin"
  const query = parseProjectQuery(await searchParams)
  const supabase = await createClient()

  // La RLS ne renvoie au client que ses projets ; le volume reste faible, on filtre ici.
  const [{ data }, { data: clients }] = await Promise.all([
    supabase.from("project_overview").select("*").returns<ProjectOverview[]>(),
    isAdmin ? supabase.from("clients").select("id, name, company").order("name") : Promise.resolve({ data: null }),
  ])

  const visible = (data ?? [])
    .filter((p) => isAdmin || p.status !== "draft")
    .filter((p) => !query.clientId || p.client_id === query.clientId)

  const counts = Object.fromEntries(
    PROJECT_VIEWS.map((v) => [v.value, visible.filter((p) => matchesView(p, v.value)).length]),
  ) as Record<ProjectView, number>
  const projects = sortProjects(
    visible.filter((p) => matchesView(p, query.view)),
    query.sort,
  )

  const hasAny = (data ?? []).length > 0

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={isAdmin ? "Tous les projets" : "Espace client"}
        title={isAdmin ? "Projets" : "Mes projets"}
        actions={
          isAdmin && (
            <Link href="/projects/new" className={buttonVariants({ size: "lg" })}>
              <Plus /> Nouveau projet
            </Link>
          )
        }
      />

      {!hasAny ? (
        <EmptyState
          icon={FolderKanban}
          title="Aucun projet pour l'instant"
          description={isAdmin ? "Crée ton premier projet." : "Tes projets apparaîtront ici dès qu'ils seront partagés avec toi."}
        />
      ) : (
        <>
          <ProjectFilters
            query={query}
            counts={counts}
            clients={
              clients?.map((c) => ({ id: c.id, label: c.company ? `${c.company} — ${c.name}` : c.name })) ?? null
            }
          />
          {projects.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={query.view === "a-faire" ? "Rien en cours" : "Aucun projet dans cette vue"}
              description={query.view === "a-faire" ? "Tous les projets sont terminés ou archivés." : undefined}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} showClient={isAdmin} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
