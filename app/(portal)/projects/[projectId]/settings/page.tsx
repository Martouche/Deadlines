import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Trash2 } from "lucide-react"

import { ConfirmButton } from "@/components/app/confirm-button"
import { MembersManager } from "@/components/project/members-manager"
import { ProjectForm } from "@/components/project/project-form"
import { Button } from "@/components/ui/button"
import { deleteProject, updateProject } from "@/lib/actions/projects"
import { getProject } from "@/lib/projects"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Paramètres du projet" }

type Person = { id: string; email: string; full_name: string | null }

export default async function ProjectSettingsPage({ params }: PageProps<"/projects/[projectId]/settings">) {
  const { projectId } = await params
  const { project, isAdmin } = await getProject(projectId)
  if (!isAdmin) notFound()

  const supabase = await createClient()
  const [{ data: clients }, { data: memberRows }, { data: clientUsers }] = await Promise.all([
    supabase.from("clients").select("id, name, company").order("name"),
    supabase
      .from("project_members")
      .select("profile:profiles(id, email, full_name)")
      .eq("project_id", projectId)
      .returns<{ profile: Person | null }[]>(),
    supabase.from("profiles").select("id, email, full_name").eq("client_id", project.client_id).returns<Person[]>(),
  ])

  const members = (memberRows ?? []).flatMap((r) => (r.profile ? [r.profile] : []))
  const memberIds = new Set(members.map((m) => m.id))
  const candidates = (clientUsers ?? []).filter((u) => !memberIds.has(u.id))

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">Projet</h2>
        <div className="rounded-xl border border-white/10 p-6">
          <ProjectForm
            action={updateProject.bind(null, projectId)}
            clients={(clients ?? []).map((c) => ({ id: c.id, label: c.company ? `${c.company} — ${c.name}` : c.name }))}
            project={project}
            submitLabel="Enregistrer"
            successMessage="Projet mis à jour."
          />
        </div>
      </section>

      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">Accès client</h2>
          <MembersManager projectId={projectId} clientId={project.client_id} members={members} candidates={candidates} />
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-red-400/20 p-5">
          <h2 className="text-sm font-medium text-red-300">Zone sensible</h2>
          <p className="text-xs text-muted-foreground">
            Supprime le projet, ses tâches, commentaires, documents (fichiers compris), temps et journal.
          </p>
          <ConfirmButton
            title="Supprimer définitivement ce projet ?"
            description="Cette action est irréversible."
            confirmLabel="Supprimer le projet"
            onConfirm={deleteProject.bind(null, projectId)}
            trigger={
              <Button variant="destructive" className="w-fit">
                <Trash2 /> Supprimer le projet
              </Button>
            }
          />
        </section>
      </div>
    </div>
  )
}
