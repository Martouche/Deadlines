import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"

import { ConfirmButton } from "@/components/app/confirm-button"
import { PageHeader } from "@/components/app/page-header"
import { ClientForm } from "@/components/clients/client-form"
import { InviteForm } from "@/components/clients/invite-form"
import { FinancialBadge, ProjectStatusLabel } from "@/components/project/status-badges"
import { Button, buttonVariants } from "@/components/ui/button"
import { deleteClientRecord, updateClientRecord } from "@/lib/actions/clients"
import { displayName, formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import type { Client, FinancialStatus, ProjectStatus } from "@/lib/types"

export const metadata: Metadata = { title: "Fiche client" }

type ClientProject = { id: string; title: string; status: ProjectStatus; financial_status: FinancialStatus; deadline: string | null }
type ClientUser = { id: string; email: string; full_name: string | null; project_members: { project_id: string }[] }

export default async function ClientPage({ params }: PageProps<"/admin/clients/[clientId]">) {
  const { clientId } = await params
  const supabase = await createClient()

  const [{ data: client }, { data: projects }, { data: users }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).maybeSingle<Client>(),
    supabase
      .from("projects")
      .select("id, title, status, financial_status, deadline")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .returns<ClientProject[]>(),
    supabase
      .from("profiles")
      .select("id, email, full_name, project_members(project_id)")
      .eq("client_id", clientId)
      .returns<ClientUser[]>(),
  ])
  if (!client) notFound()

  const projectTitle = new Map((projects ?? []).map((p) => [p.id, p.title]))

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow={client.company ?? "Client"}
        title={client.name}
        description={client.email}
        actions={
          <ConfirmButton
            title="Supprimer ce client ?"
            description="Possible uniquement s'il n'a plus de projet. Ses comptes portail seront détachés."
            confirmLabel="Supprimer"
            onConfirm={deleteClientRecord.bind(null, client.id)}
            trigger={
              <Button variant="ghost" size="lg">
                <Trash2 /> Supprimer
              </Button>
            }
          />
        }
      />

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">Informations</h2>
          <div className="rounded-xl border border-white/10 p-5">
            <ClientForm
              action={updateClientRecord.bind(null, client.id)}
              client={client}
              submitLabel="Enregistrer"
              successMessage="Client mis à jour."
            />
          </div>
        </section>

        <div className="flex flex-col gap-10">
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Projets</h2>
              <Link href={`/projects/new?client=${client.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Plus /> Nouveau projet
              </Link>
            </div>
            <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
              {(projects ?? []).length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun projet.</li>
              )}
              {(projects ?? []).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        <ProjectStatusLabel status={p.status} /> · échéance {formatDate(p.deadline)}
                      </p>
                    </div>
                    <FinancialBadge status={p.financial_status} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-muted-foreground">Accès au portail</h2>
            {(users ?? []).length > 0 && (
              <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
                {(users ?? []).map((u) => (
                  <li key={u.id} className="px-4 py-3">
                    <p className="text-sm font-medium">{displayName(u)}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.email} ·{" "}
                      {u.project_members.length === 0
                        ? "aucun projet"
                        : u.project_members.map((m) => projectTitle.get(m.project_id) ?? "autre projet").join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="rounded-xl border border-white/10 p-5">
              <InviteForm
                clientId={client.id}
                defaultEmail={(users ?? []).length === 0 ? client.email : ""}
                projects={(projects ?? []).map((p) => ({ id: p.id, title: p.title }))}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
