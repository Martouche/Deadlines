"use client"

import { useRef, useState, useTransition } from "react"
import {
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  FolderOpen,
  KeyRound,
  Link2,
  Loader2,
  MonitorPlay,
  PenTool,
  Receipt,
  ScrollText,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { ConfirmButton } from "@/components/app/confirm-button"
import { EmptyState } from "@/components/app/empty-state"
import { Field } from "@/components/app/field"
import { SubmitButton } from "@/components/app/submit-button"
import { useFormAction } from "@/components/app/use-form-action"
import { FormMessage } from "@/components/auth/form-message"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import {
  addLinkDocument,
  deleteDocument,
  getDownloadUrl,
  registerUpload,
  setDocumentVisibility,
} from "@/lib/actions/documents"
import { DOCUMENT_KINDS, optionOf } from "@/lib/constants"
import { formatBytes, formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import type { DocumentKind, ProjectDocument } from "@/lib/types"

const KIND_ICONS: Record<DocumentKind, LucideIcon> = {
  file: FileText,
  invoice: Receipt,
  spec: ScrollText,
  access: KeyRound,
  figma: PenTool,
  staging: MonitorPlay,
  link: Link2,
}

const FILE_KINDS = DOCUMENT_KINDS.filter((k) => ["file", "invoice", "spec", "access"].includes(k.value))
const LINK_KINDS = DOCUMENT_KINDS.filter((k) => ["figma", "staging", "link", "access"].includes(k.value))

type DocumentsPanelProps = { projectId: string; documents: ProjectDocument[]; isAdmin: boolean }

export function DocumentsPanel({ projectId, documents, isAdmin }: DocumentsPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <UploadDialog projectId={projectId} />
          <LinkDialog projectId={projectId} />
        </div>
      )}

      {documents.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Aucun document"
          description={isAdmin ? "Dépose le cahier des charges, les factures, les liens Figma ou de recette." : "Les livrables apparaîtront ici."}
        />
      ) : (
        <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
          {documents.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} isAdmin={isAdmin} />
          ))}
        </ul>
      )}
    </div>
  )
}

function DocumentRow({ doc, isAdmin }: { doc: ProjectDocument; isAdmin: boolean }) {
  const [pending, startTransition] = useTransition()
  const Icon = KIND_ICONS[doc.kind]

  const download = () =>
    startTransition(async () => {
      const result = await getDownloadUrl(doc.id)
      if (result.url) window.location.assign(result.url)
      else toast.error(result.error ?? "Téléchargement impossible.")
    })

  const toggleVisibility = () =>
    startTransition(async () => {
      const result = await setDocumentVisibility(doc.id, !doc.visible_to_client)
      if (result.error) toast.error(result.error)
    })

  return (
    <li className="flex items-center gap-4 px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{doc.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {optionOf(DOCUMENT_KINDS, doc.kind).label} · {formatDate(doc.created_at)}
          {doc.size_bytes ? ` · ${formatBytes(doc.size_bytes)}` : ""}
          {isAdmin && !doc.visible_to_client && " · privé"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleVisibility}
            disabled={pending}
            aria-label={doc.visible_to_client ? "Masquer au client" : "Rendre visible au client"}
            title={doc.visible_to_client ? "Visible par le client" : "Privé"}
          >
            {doc.visible_to_client ? <Eye /> : <EyeOff />}
          </Button>
        )}
        {doc.url ? (
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[0.8rem] font-medium hover:bg-muted"
          >
            <ExternalLink className="size-3.5" /> Ouvrir
          </a>
        ) : (
          <Button variant="ghost" size="sm" onClick={download} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Download />} Télécharger
          </Button>
        )}
        {isAdmin && (
          <ConfirmButton
            title="Supprimer ce document ?"
            description={doc.storage_path ? "Le fichier sera définitivement supprimé." : "Le lien sera retiré du projet."}
            confirmLabel="Supprimer"
            onConfirm={() => deleteDocument(doc.id)}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Supprimer">
                <Trash2 />
              </Button>
            }
          />
        )}
      </div>
    </li>
  )
}

function UploadDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  const fileRef = useRef<HTMLInputElement>(null)

  const upload = (formData: FormData) => {
    const file = fileRef.current?.files?.[0]
    if (!file) return setError("Choisis un fichier.")
    setError(undefined)

    startTransition(async () => {
      const safeName = file.name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^\w.-]+/g, "-")
      const path = `${projectId}/${crypto.randomUUID()}-${safeName}`
      const supabase = createClient()
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(path, file, { contentType: file.type || undefined })
      if (uploadError) return setError(`Envoi impossible : ${uploadError.message}`)

      const result = await registerUpload(projectId, {
        path,
        title: String(formData.get("title") || file.name),
        kind: String(formData.get("kind")) as DocumentKind,
        mimeType: file.type,
        size: file.size,
        visibleToClient: formData.get("visible_to_client") === "on",
      })
      if (result.error) return setError(result.error)
      toast.success("Fichier ajouté.")
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" />}>
        <Upload /> Déposer un fichier
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Déposer un fichier</DialogTitle>
        </DialogHeader>
        <form action={upload} className="flex flex-col gap-4">
          <Field label="Fichier" htmlFor="file">
            <Input id="file" ref={fileRef} type="file" required className="h-9 py-1.5" />
          </Field>
          <Field label="Titre" htmlFor="doc-title" hint="Par défaut : le nom du fichier.">
            <Input id="doc-title" name="title" className="h-9" />
          </Field>
          <KindAndVisibility kinds={FILE_KINDS} />
          <FormMessage tone="error" message={error} />
          <Button type="submit" size="lg" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Envoyer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function LinkDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const [state, action] = useFormAction(addLinkDocument.bind(null, projectId), "Lien ajouté.", () => setOpen(false))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" variant="outline" />}>
        <Link2 /> Ajouter un lien
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un lien</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <Field label="URL" htmlFor="link-url">
            <Input id="link-url" name="url" type="url" required placeholder="https://" className="h-9" />
          </Field>
          <Field label="Titre" htmlFor="link-title">
            <Input id="link-title" name="title" required placeholder="Maquettes Figma" className="h-9" />
          </Field>
          <KindAndVisibility kinds={LINK_KINDS} />
          <FormMessage tone="error" message={state.error} />
          <SubmitButton>Ajouter</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function KindAndVisibility({ kinds }: { kinds: typeof DOCUMENT_KINDS }) {
  return (
    <>
      <Field label="Type" htmlFor="kind">
        <NativeSelect id="kind" name="kind" defaultValue={kinds[0].value}>
          {kinds.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="visible_to_client" defaultChecked className="size-4 accent-foreground" />
        Visible par le client
      </label>
      <p className="-mt-2 text-xs text-muted-foreground">
        Pour des accès sensibles, préfère un lien de partage sécurisé (Bitwarden Send, 1Password) à un mot de passe en clair.
      </p>
    </>
  )
}
