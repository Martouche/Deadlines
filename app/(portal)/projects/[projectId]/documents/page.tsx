import type { Metadata } from "next"

import { DocumentsPanel } from "@/components/documents/documents-panel"
import { getProject } from "@/lib/projects"
import { createClient } from "@/lib/supabase/server"
import type { ProjectDocument } from "@/lib/types"

export const metadata: Metadata = { title: "Documents & livrables" }

export default async function DocumentsPage({ params }: PageProps<"/projects/[projectId]/documents">) {
  const { projectId } = await params
  const { isAdmin } = await getProject(projectId)
  const supabase = await createClient()

  // La RLS masque au client les documents non visibles.
  const { data } = await supabase
    .from("project_documents")
    .select("id, kind, title, description, storage_path, url, mime_type, size_bytes, visible_to_client, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .returns<ProjectDocument[]>()

  return <DocumentsPanel projectId={projectId} documents={data ?? []} isAdmin={isAdmin} />
}
