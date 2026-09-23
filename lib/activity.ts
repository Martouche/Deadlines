import { DOCUMENT_KINDS, FINANCIAL_STATUSES, PROJECT_STATUSES, TASK_STATUSES, optionOf } from "@/lib/constants"
import { displayName, formatDate } from "@/lib/format"
import type { ActivityLog, DocumentKind, FinancialStatus, ProjectStatus, TaskStatus } from "@/lib/types"

/** "Martin a passé « Maquette » en « En révision »" */
export function formatActivity(log: ActivityLog) {
  const who = displayName(log.actor)
  const m = log.meta
  const title = `« ${m.title ?? "tâche supprimée"} »`

  switch (log.action) {
    case "task.created":
      return `${who} a créé la tâche ${title}`
    case "task.deleted":
      return `${who} a supprimé la tâche ${title}`
    case "task.status_changed":
      return `${who} a passé ${title} en « ${optionOf(TASK_STATUSES, m.to as TaskStatus).label} »`
    case "task.deadline_changed":
      return m.to
        ? `${who} a fixé l'échéance de ${title} au ${formatDate(m.to, "d MMMM")}`
        : `${who} a retiré l'échéance de ${title}`
    case "task.validated":
      return `${who} a validé ${title}`
    case "comment.created":
      return `${who} a commenté ${title}`
    case "document.added":
      return `${who} a ajouté ${optionOf(DOCUMENT_KINDS, m.kind as DocumentKind).label.toLowerCase()} « ${m.title} »`
    case "project.financial_status_changed":
      return `${who} a passé le statut financier à « ${optionOf(FINANCIAL_STATUSES, m.to as FinancialStatus).label} »`
    case "project.status_changed":
      return `${who} a passé le projet en « ${optionOf(PROJECT_STATUSES, m.to as ProjectStatus).label} »`
    default:
      return `${who} : ${log.action}`
  }
}
