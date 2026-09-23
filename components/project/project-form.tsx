"use client"

import { Field } from "@/components/app/field"
import { SubmitButton } from "@/components/app/submit-button"
import { useFormAction } from "@/components/app/use-form-action"
import { FormMessage } from "@/components/auth/form-message"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { FINANCIAL_STATUSES, PROJECT_STATUSES } from "@/lib/constants"
import type { ActionResult, FinancialStatus, ProjectStatus } from "@/lib/types"

export type ProjectFormValues = {
  client_id: string
  title: string
  description: string | null
  status: ProjectStatus
  financial_status: FinancialStatus
  budget_cents: number | null
  start_date: string | null
  deadline: string | null
}

type ProjectFormProps = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>
  clients: { id: string; label: string }[]
  project?: Partial<ProjectFormValues>
  submitLabel: string
  successMessage?: string
}

export function ProjectForm({ action, clients, project, submitLabel, successMessage }: ProjectFormProps) {
  const [state, formAction] = useFormAction(action, successMessage)

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client" htmlFor="client_id">
          <NativeSelect id="client_id" name="client_id" required defaultValue={project?.client_id ?? ""}>
            <option value="" disabled>
              Choisir un client…
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Titre" htmlFor="title">
          <Input id="title" name="title" required defaultValue={project?.title} className="h-9" />
        </Field>
      </div>

      <Field label="Description" htmlFor="description" hint="Visible par le client.">
        <Textarea id="description" name="description" rows={3} defaultValue={project?.description ?? ""} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Statut" htmlFor="status">
          <NativeSelect id="status" name="status" defaultValue={project?.status ?? "active"}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Statut financier" htmlFor="financial_status">
          <NativeSelect id="financial_status" name="financial_status" defaultValue={project?.financial_status ?? "quote_sent"}>
            {FINANCIAL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Budget (€ HT)" htmlFor="budget">
          <Input
            id="budget"
            name="budget"
            inputMode="decimal"
            placeholder="4 500"
            defaultValue={project?.budget_cents != null ? String(project.budget_cents / 100) : ""}
            className="h-9"
          />
        </Field>
        <Field label="Début" htmlFor="start_date">
          <Input id="start_date" name="start_date" type="date" defaultValue={project?.start_date ?? ""} className="h-9" />
        </Field>
        <Field label="Deadline finale" htmlFor="deadline">
          <Input id="deadline" name="deadline" type="date" defaultValue={project?.deadline ?? ""} className="h-9" />
        </Field>
      </div>

      <FormMessage tone="error" message={state.error} />
      <div>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  )
}
