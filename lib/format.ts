import { differenceInCalendarDays, format, formatDistanceToNow, parseISO } from "date-fns"
import { fr } from "date-fns/locale"

export function formatDate(value: string | null, pattern = "d MMM yyyy") {
  if (!value) return "—"
  return format(parseISO(value), pattern, { locale: fr })
}

export function formatRelative(value: string) {
  return formatDistanceToNow(parseISO(value), { addSuffix: true, locale: fr })
}

/** Jours restants avant une date (négatif = en retard). */
export function daysUntil(value: string) {
  return differenceInCalendarDays(parseISO(value), new Date())
}

export function formatDeadline(value: string | null) {
  if (!value) return "Sans échéance"
  const days = daysUntil(value)
  if (days < 0) return `En retard de ${-days} j`
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return "Demain"
  if (days <= 7) return `Dans ${days} j`
  return formatDate(value, "d MMM")
}

export function formatMoney(cents: number | null, currency = "EUR") {
  if (cents == null) return "—"
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100)
}

export function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`
}

export function formatBytes(bytes: number | null) {
  if (!bytes) return ""
  const units = ["o", "Ko", "Mo", "Go"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function displayName(person: { full_name: string | null; email: string } | null) {
  if (!person) return "Quelqu'un"
  return person.full_name || person.email.split("@")[0]
}
