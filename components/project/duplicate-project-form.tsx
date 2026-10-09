"use client"

import { Field } from "@/components/app/field"
import { SubmitButton } from "@/components/app/submit-button"
import { useFormAction } from "@/components/app/use-action"
import { FormMessage } from "@/components/auth/form-message"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { duplicateProject } from "@/lib/actions/projects"

type DuplicateProjectFormProps = {
  projectId: string
  title: string
  clientId: string
  clients: { id: string; label: string }[]
}

/** Sert de « modèle » : n'importe quel projet peut être dupliqué pour un autre client. */
export function DuplicateProjectForm({ projectId, title, clientId, clients }: DuplicateProjectFormProps) {
  const [state, action] = useFormAction(duplicateProject.bind(null, projectId))

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Client" htmlFor="dup-client">
        <NativeSelect id="dup-client" name="client_id" defaultValue={clientId}>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Titre de la copie" htmlFor="dup-title">
        <Input id="dup-title" name="title" required defaultValue={`${title} (copie)`} className="h-9" />
      </Field>
      <FormMessage tone="error" message={state.error} />
      <SubmitButton variant="outline">Dupliquer</SubmitButton>
    </form>
  )
}
