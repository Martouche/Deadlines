"use client"

import { useRef } from "react"

import { Field } from "@/components/app/field"
import { SubmitButton } from "@/components/app/submit-button"
import { useFormAction } from "@/components/app/use-form-action"
import { FormMessage } from "@/components/auth/form-message"
import { Input } from "@/components/ui/input"
import { inviteClientUser } from "@/lib/actions/clients"

type InviteFormProps = {
  clientId: string
  defaultEmail: string
  projects: { id: string; title: string }[]
}

export function InviteForm({ clientId, defaultEmail, projects }: InviteFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action] = useFormAction(inviteClientUser.bind(null, clientId), "Accès envoyé.", () =>
    formRef.current?.reset(),
  )

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="E-mail" htmlFor="invite-email">
          <Input id="invite-email" name="email" type="email" required defaultValue={defaultEmail} className="h-9" />
        </Field>
        <Field label="Nom affiché" htmlFor="invite-name">
          <Input id="invite-name" name="full_name" className="h-9" />
        </Field>
      </div>

      {projects.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Projets accessibles</legend>
          {projects.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="project_ids" value={p.id} defaultChecked className="size-4 accent-foreground" />
              {p.title}
            </label>
          ))}
        </fieldset>
      )}

      <FormMessage tone="error" message={state.error} />
      <div>
        <SubmitButton>Envoyer l&apos;invitation</SubmitButton>
      </div>
    </form>
  )
}
