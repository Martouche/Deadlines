import type { Metadata } from "next"
import Link from "next/link"
import { FolderKanban, Plus } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { ProjectCard } from "@/components/project/project-card"
import { buttonVariants } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { ProjectOverview } from "@/lib/types"

export const metadata: Metadata = { title: "Projets" }

const CLOSED = ["completed", "archived"]

export default async function ProjectsPage() {
  const profile = await requireUser()
  const isAdmin = profile.role === "admin"
  const supabase = await createClient()

  // La RLS ne renvoie au client que ses projets.
  const { data } = await supabase
    .from("project_overview")
    .select("*")
    .order("updated_at", { ascending: false })
    .returns<ProjectOverview[]>()
  const projects = (data ?? []).filter((p) => isAdmin || p.status !== "draft")
  const open = projects.filter((p) => !CLOSED.includes(p.status))
  const closed = projects.filter((p) => CLOSED.includes(p.status))

  return (
    <div className="flex flex-col gap-10">
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

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Aucun projet pour l'instant"
          description={isAdmin ? "Crée ton premier projet." : "Tes projets apparaîtront ici dès qu'ils seront partagés avec toi."}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {open.map((p) => (
              <ProjectCard key={p.id} project={p} showClient={isAdmin} />
            ))}
          </div>
          {closed.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-medium text-muted-foreground">Terminés et archivés</h2>
              <div className="grid gap-4 opacity-70 md:grid-cols-2 xl:grid-cols-3">
                {closed.map((p) => (
                  <ProjectCard key={p.id} project={p} showClient={isAdmin} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
