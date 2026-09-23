"use server"

import { refresh } from "next/cache"

import { FormError, formErrorMessage, requiredText, text } from "@/lib/actions/form"
import { assertAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult, DocumentKind } from "@/lib/types"

export async function addLinkDocument(projectId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await assertAdmin()
  try {
    const url = requiredText(formData, "url", "L'URL")
    if (!/^https?:\/\//i.test(url)) throw new FormError("L'URL doit commencer par https://")
    const supabase = await createClient()
    const { error } = await supabase.from("project_documents").insert({
      project_id: projectId,
      kind: (text(formData, "kind") ?? "link") as DocumentKind,
      title: requiredText(formData, "title", "Le titre"),
      description: text(formData, "description"),
      url,
      visible_to_client: formData.get("visible_to_client") === "on",
    })
    if (error) throw new FormError(error.message)
  } catch (error) {
    return { error: formErrorMessage(error) }
  }
  refresh()
  return {}
}

/** Enregistre un fichier déjà envoyé dans le bucket par le navigateur. */
export async function registerUpload(
  projectId: string,
  file: { path: string; title: string; kind: DocumentKind; mimeType: string; size: number; visibleToClient: boolean },
): Promise<ActionResult> {
  await assertAdmin()
  if (!file.path.startsWith(`${projectId}/`)) return { error: "Chemin de fichier invalide." }

  const supabase = await createClient()
  const { error } = await supabase.from("project_documents").insert({
    project_id: projectId,
    kind: file.kind,
    title: file.title,
    storage_path: file.path,
    mime_type: file.mimeType,
    size_bytes: file.size,
    visible_to_client: file.visibleToClient,
  })
  if (error) {
    await supabase.storage.from("project-files").remove([file.path])
    return { error: error.message }
  }
  refresh()
  return {}
}

export async function setDocumentVisibility(documentId: string, visible: boolean): Promise<ActionResult> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from("project_documents").update({ visible_to_client: visible }).eq("id", documentId)
  if (error) return { error: error.message }
  refresh()
  return {}
}

export async function deleteDocument(documentId: string): Promise<ActionResult> {
  await assertAdmin()
  const supabase = await createClient()
  const { data: doc } = await supabase
    .from("project_documents")
    .select("storage_path")
    .eq("id", documentId)
    .single()
  if (doc?.storage_path) await supabase.storage.from("project-files").remove([doc.storage_path])

  const { error } = await supabase.from("project_documents").delete().eq("id", documentId)
  if (error) return { error: error.message }
  refresh()
  return {}
}

/** URL signée d'une minute. La RLS Storage refuse si l'utilisateur n'a pas accès au document. */
export async function getDownloadUrl(documentId: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: doc } = await supabase
    .from("project_documents")
    .select("storage_path, title")
    .eq("id", documentId)
    .maybeSingle()
  if (!doc?.storage_path) return { error: "Document introuvable." }

  const fileName = doc.storage_path.split("/").pop()?.replace(/^[0-9a-f-]{36}-/, "") ?? doc.title
  const { data, error } = await supabase.storage
    .from("project-files")
    .createSignedUrl(doc.storage_path, 60, { download: fileName })
  if (error) return { error: "Téléchargement impossible." }
  return { url: data.signedUrl }
}
