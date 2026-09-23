// Lecture typée des champs de formulaire (partagé par les Server Actions).

export function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim()
  return value === "" ? null : value
}

export function requiredText(formData: FormData, key: string, label: string) {
  const value = text(formData, key)
  if (!value) throw new FormError(`${label} est obligatoire.`)
  return value
}

/** Montant saisi en euros (« 1 250,50 ») → centimes. */
export function euros(formData: FormData, key: string) {
  const raw = text(formData, key)
  if (!raw) return null
  const value = Number(raw.replace(/\s/g, "").replace(",", "."))
  if (!Number.isFinite(value) || value < 0) throw new FormError("Montant invalide.")
  return Math.round(value * 100)
}

export class FormError extends Error {}

/** Transforme une FormError en { error } ; relance tout le reste (redirect, erreurs inattendues). */
export function formErrorMessage(error: unknown) {
  if (error instanceof FormError) return error.message
  throw error
}
