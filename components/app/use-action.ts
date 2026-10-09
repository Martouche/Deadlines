"use client"

import { useActionState, useTransition } from "react"
import { unstable_rethrow } from "next/navigation"
import { toast } from "sonner"

import type { ActionResult } from "@/lib/types"

const NETWORK_ERROR = "Le serveur n'a pas répondu. Vérifie ta connexion puis réessaie."

type RunOptions = { success?: string; onSuccess?: () => void }

/**
 * Appelle une Server Action dans une transition. Toute erreur (renvoyée par
 * l'action ou levée par le réseau) s'affiche en toast et part dans la console.
 */
export function useAction() {
  const [pending, startTransition] = useTransition()

  const run = (fn: () => Promise<ActionResult | void>, options: RunOptions = {}) =>
    startTransition(async () => {
      try {
        const result = await fn()
        if (result?.error) {
          console.warn("[action]", result.error)
          toast.error(result.error)
          return
        }
        if (options.success) toast.success(options.success)
        options.onSuccess?.()
      } catch (error) {
        unstable_rethrow(error)
        console.error("[action]", error)
        toast.error(NETWORK_ERROR)
      }
    })

  return { pending, run }
}

type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>

/** useActionState + toast de succès, callback optionnel, et erreur réseau rattrapée. */
export function useFormAction(action: FormAction, successMessage?: string, onSuccess?: () => void) {
  return useActionState<ActionResult, FormData>(async (prev, formData) => {
    try {
      const result = await action(prev, formData)
      if (result.error) console.warn("[action]", result.error)
      else {
        if (successMessage) toast.success(successMessage)
        onSuccess?.()
      }
      return result
    } catch (error) {
      unstable_rethrow(error)
      console.error("[action]", error)
      return { error: NETWORK_ERROR }
    }
  }, {})
}
