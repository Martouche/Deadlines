"use client"

import { useActionState } from "react"
import { toast } from "sonner"

import type { ActionResult } from "@/lib/types"

type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>

/** useActionState + toast de succès et callback optionnel une fois l'action réussie. */
export function useFormAction(action: FormAction, successMessage?: string, onSuccess?: () => void) {
  return useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result = await action(prev, formData)
    if (!result.error) {
      if (successMessage) toast.success(successMessage)
      onSuccess?.()
    }
    return result
  }, {})
}
