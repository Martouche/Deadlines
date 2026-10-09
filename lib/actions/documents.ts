"use server"

import { refresh } from "next/cache"

import { formContext, requiredText, text } from "@/lib/actions/form"
import { ActionError, check, checkRows, runAction } from "@/lib/actions/run"
import { assertAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult, DocumentKind } from "@/lib/types"

export async function addLinkDocument(projectId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction("documents.link.add", { projectId, ...formContext(formData) }, async () => {
    await assertAdmin()
    const url = requiredText(formData, "url", "L'URL")
    if (!/^https?:\/\//i.test(url)) throw new ActionError("L'URL doit commencer par https://")
    const supabase = await createClient()
    check(
      await supabase.from("project_documents").insert({
        project_id: projectId,
        kind: (text(formData, "kind") ?? "link") as DocumentKind,
        title: requiredText(formData, "title", "Le titre"),
        description: text(formData, "description"),
        url,
        visible_to_client: formData.get("visible_to_client") === "on",
      }),
      "Ajout du lien",
    )
    refresh()
  })
}

/** Enregistre un fichier déjà envoyé dans le bucket par le navigateur. */
export async function registerUpload(
  projectId: string,
  file: { path: string; title: string; kind: DocumentKind; mimeType: string; size: number; visibleToClient: boolean },
): Promise<ActionResult> {
  return runAction("documents.upload.register", { projectId, ...file }, async () => {
    await assertAdmin()
    if (!file.path.startsWith(`${projectId}/`)) throw new ActionError("Chemin de fichier invalide.")

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
      // Pas de fichier orphelin dans le bucket.
      await supabase.storage.from("project-files").remove([file.path])
      check({ data: null, error }, "Enregistrement du fichier")
    }
    refresh()
  })
}

export async function setDocumentVisibility(documentId: string, visible: boolean): Promise<ActionResult> {
  return runAction("documents.visibility", { documentId, visible }, async () => {
    await assertAdmin()
    const supabase = await createClient()
    checkRows(
      await supabase.from("project_documents").update({ visible_to_client: visible }).eq("id", documentId).select("id"),
      "Changement de visibilité",
    )
    refresh()
  })
}

export async function deleteDocument(documentId: string): Promise<ActionResult> {
  return runAction("documents.delete", { documentId }, async () => {
    await assertAdmin()
    const supabase = await createClient()
    const doc = check(
      await supabase.from("project_documents").select("storage_path").eq("id", documentId).single(),
      "Lecture du document",
    )
    if (doc.storage_path) {
      check(await supabase.storage.from("project-files").remove([doc.storage_path]), "Suppression du fichier")
    }
    checkRows(
      await supabase.from("project_documents").delete().eq("id", documentId).select("id"),
      "Suppression du document",
    )
    refresh()
  })
}

/** URL signée d'une minute. La RLS Storage refuse si l'utilisateur n'a pas accès au document. */
type DownloadResult = ActionResult & { url?: string }

export async function getDownloadUrl(documentId: string): Promise<DownloadResult> {
  return runAction("documents.download", { documentId }, async (): Promise<DownloadResult> => {
    const supabase = await createClient()
    const doc = check(
      await supabase.from("project_documents").select("storage_path, title").eq("id", documentId).maybeSingle(),
      "Lecture du document",
    )
    if (!doc?.storage_path) throw new ActionError("Document introuvable.")

    const fileName = doc.storage_path.split("/").pop()?.replace(/^[0-9a-f-]{36}-/, "") ?? doc.title
    const signed = check(
      await supabase.storage.from("project-files").createSignedUrl(doc.storage_path, 60, { download: fileName }),
      "Préparation du téléchargement",
    )
    return { url: signed.signedUrl }
  })
}
