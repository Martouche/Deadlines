"use client"

import { Field } from "@/components/app/field"
import { SubmitButton } from "@/components/app/submit-button"
import { useFormAction } from "@/components/app/use-form-action"
import { FormMessage } from "@/components/auth/form-message"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ActionResult, Client } from "@/lib/types"

type ClientFormProps = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>
  client?: Client
  submitLabel: string
  successMessage?: string
}

export function ClientForm({ action, client, submitLabel, successMessage }: ClientFormProps) {
  const [state, formAction] = useFormAction(action, successMessage)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom du contact" htmlFor="name">
          <Input id="name" name="name" required defaultValue={client?.name} className="h-9" />
        </Field>
        <Field label="Entreprise" htmlFor="company">
          <Input id="company" name="company" defaultValue={client?.company ?? ""} className="h-9" />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <Input id="email" name="email" type="email" required defaultValue={client?.email} className="h-9" />
        </Field>
        <Field label="Téléphone" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" defaultValue={client?.phone ?? ""} className="h-9" />
        </Field>
      </div>
      <Field label="Notes privées" htmlFor="notes" hint="Jamais visibles par le client.">
        <Textarea id="notes" name="notes" rows={4} defaultValue={client?.notes ?? ""} />
      </Field>
      <FormMessage tone="error" message={state.error} />
      <div>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  )
}
