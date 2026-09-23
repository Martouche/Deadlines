import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/app/page-header"
import { ProjectForm } from "@/components/project/project-form"
import { buttonVariants } from "@/components/ui/button"
import { createProject } from "@/lib/actions/projects"
import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Nouveau projet" }

export default async function NewProjectPage({ searchParams }: PageProps<"/projects/new">) {
  await requireAdmin()
  const { client } = await searchParams
  const supabase = await createClient()
  const { data: clients } = await supabase.from("clients").select("id, name, company").order("name")

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageHeader eyebrow="Projets" title="Nouveau projet" />
      {(clients ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Crée d&apos;abord un client.{" "}
          <Link href="/admin/clients" className={buttonVariants({ variant: "link" })}>
            Aller aux clients
          </Link>
        </p>
      ) : (
        <div className="rounded-xl border border-white/10 p-6">
          <ProjectForm
            action={createProject}
            clients={(clients ?? []).map((c) => ({ id: c.id, label: c.company ? `${c.company} — ${c.name}` : c.name }))}
            project={{ client_id: typeof client === "string" ? client : undefined }}
            submitLabel="Créer le projet"
          />
        </div>
      )}
    </div>
  )
}
