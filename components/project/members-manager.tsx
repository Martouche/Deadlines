"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Loader2, UserMinus, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { addProjectMember, removeProjectMember } from "@/lib/actions/projects"
import { displayName } from "@/lib/format"
import type { ActionResult } from "@/lib/types"

type Person = { id: string; email: string; full_name: string | null }

type MembersManagerProps = {
  projectId: string
  clientId: string
  members: Person[]
  candidates: Person[]
}

export function MembersManager({ projectId, clientId, members, candidates }: MembersManagerProps) {
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState("")

  const run = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const result = await fn()
      if (result.error) toast.error(result.error)
      else setSelected("")
    })

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
        {members.length === 0 && (
          <li className="px-4 py-5 text-center text-sm text-muted-foreground">Aucun client n&apos;a encore accès à ce projet.</li>
        )}
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName(m)}</p>
              <p className="truncate text-xs text-muted-foreground">{m.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => run(() => removeProjectMember(projectId, m.id))}
            >
              <UserMinus /> Retirer
            </Button>
          </li>
        ))}
      </ul>

      {candidates.length > 0 ? (
        <div className="flex gap-2">
          <div className="flex-1">
            <NativeSelect value={selected} onChange={(e) => setSelected(e.target.value)} aria-label="Compte à ajouter">
              <option value="">Donner accès à…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {displayName(c)} ({c.email})
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button disabled={!selected || pending} onClick={() => run(() => addProjectMember(projectId, selected))}>
            {pending ? <Loader2 className="animate-spin" /> : <UserPlus />} Ajouter
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Pour donner accès à un nouveau contact, invite-le depuis{" "}
          <Link href={`/admin/clients/${clientId}`} className="underline underline-offset-4">
            la fiche client
          </Link>
          .
        </p>
      )}
    </div>
  )
}
