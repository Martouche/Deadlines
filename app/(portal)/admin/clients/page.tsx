import type { Metadata } from "next"
import Link from "next/link"
import { Users } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { NewClientDialog } from "@/components/clients/new-client-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"
import type { Client, ProjectStatus } from "@/lib/types"

export const metadata: Metadata = { title: "Clients" }

type ClientRow = Client & {
  projects: { id: string; status: ProjectStatus }[]
  profiles: { id: string }[]
}

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("clients")
    .select("*, projects(id, status), profiles(id)")
    .order("name")
    .returns<ClientRow[]>()
  const clients = data ?? []

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="CRM" title="Clients" actions={<NewClientDialog />} />

      {clients.length === 0 ? (
        <EmptyState icon={Users} title="Aucun client" description="Ajoute ton premier client pour lui créer un projet." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Nom</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead className="hidden md:table-cell">E-mail</TableHead>
                <TableHead className="text-right">Projets actifs</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Accès portail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => {
                const active = c.projects.filter((p) => p.status === "active").length
                return (
                  <TableRow key={c.id} className="border-white/10">
                    <TableCell className="font-medium">
                      <Link href={`/admin/clients/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.company ?? "—"}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{c.email}</TableCell>
                    <TableCell className="text-right font-mono">
                      {active}
                      <span className="text-muted-foreground">/{c.projects.length}</span>
                    </TableCell>
                    <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                      {c.profiles.length === 0 ? "Non invité" : `${c.profiles.length} compte${c.profiles.length > 1 ? "s" : ""}`}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
