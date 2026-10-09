import { ActionError } from "@/lib/actions/run"

// Lecture typée des champs de formulaire (partagé par les Server Actions).

export function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim()
  return value === "" ? null : value
}

export function requiredText(formData: FormData, key: string, label: string) {
  const value = text(formData, key)
  if (!value) throw new ActionError(`${label} est obligatoire.`)
  return value
}

/** Montant saisi en euros (« 1 250,50 ») → centimes. */
export function euros(formData: FormData, key: string) {
  const raw = text(formData, key)
  if (!raw) return null
  const value = Number(raw.replace(/\s/g, "").replace(",", "."))
  if (!Number.isFinite(value) || value < 0) throw new ActionError("Montant invalide.")
  return Math.round(value * 100)
}

/** Contexte de log d'un formulaire : tous les champs, sauf les secrets. */
export function formContext(formData: FormData) {
  const context: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION") || /password|confirm/i.test(key)) continue
    context[key] = value instanceof File ? `[fichier ${value.name}]` : value
  }
  return context
}
