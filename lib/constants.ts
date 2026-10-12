import type {
  DocumentKind,
  FinancialStatus,
  ProjectHealth,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from "@/lib/types"

type Option<T extends string> = { value: T; label: string; className: string }

export const TASK_STATUSES: Option<TaskStatus>[] = [
  { value: "todo", label: "À faire", className: "bg-sky-400" },
  { value: "in_progress", label: "En cours", className: "bg-violet-400" },
  { value: "review", label: "En révision", className: "bg-amber-400" },
  { value: "done", label: "Terminé", className: "bg-emerald-400" },
]

export const TASK_PRIORITIES: Option<TaskPriority>[] = [
  { value: "low", label: "Basse", className: "border-border text-muted-foreground" },
  { value: "medium", label: "Moyenne", className: "border-sky-400/30 text-sky-700 dark:text-sky-300" },
  { value: "high", label: "Haute", className: "border-amber-400/30 text-amber-700 dark:text-amber-300" },
  { value: "urgent", label: "Urgente", className: "border-red-400/40 bg-red-500/10 text-red-700 dark:text-red-300" },
]

export const PROJECT_STATUSES: Option<ProjectStatus>[] = [
  { value: "draft", label: "Brouillon", className: "text-muted-foreground" },
  { value: "active", label: "Actif", className: "text-emerald-700 dark:text-emerald-300" },
  { value: "on_hold", label: "En pause", className: "text-amber-700 dark:text-amber-300" },
  { value: "completed", label: "Terminé", className: "text-sky-700 dark:text-sky-300" },
  { value: "archived", label: "Archivé", className: "text-muted-foreground" },
]

export const FINANCIAL_STATUSES: Option<FinancialStatus>[] = [
  { value: "quote_sent", label: "Devis envoyé", className: "border-foreground/15 text-foreground/85" },
  { value: "deposit_paid", label: "Acompte payé", className: "border-sky-400/30 bg-sky-400/10 text-sky-700 dark:text-sky-300" },
  { value: "in_delivery", label: "En cours de livraison", className: "border-violet-400/30 bg-violet-400/10 text-violet-700 dark:text-violet-300" },
  { value: "balance_due", label: "Solde à régler", className: "border-amber-400/30 bg-amber-400/10 text-amber-700 dark:text-amber-300" },
  { value: "balance_paid", label: "Solde réglé", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300" },
]

export const HEALTH: Option<ProjectHealth>[] = [
  { value: "on_track", label: "Dans les temps", className: "bg-emerald-400" },
  { value: "at_risk", label: "À surveiller", className: "bg-amber-400" },
  { value: "off_track", label: "En retard", className: "bg-red-400" },
]

export const DOCUMENT_KINDS: Option<DocumentKind>[] = [
  { value: "file", label: "Fichier", className: "" },
  { value: "invoice", label: "Facture", className: "" },
  { value: "spec", label: "Cahier des charges", className: "" },
  { value: "access", label: "Accès", className: "" },
  { value: "figma", label: "Figma", className: "" },
  { value: "staging", label: "Staging / recette", className: "" },
  { value: "link", label: "Lien", className: "" },
]

/** « Backlog » n'est plus utilisé : une tâche restée dans ce statut s'affiche en « À faire ». */
export function displayStatus(status: TaskStatus): TaskStatus {
  return status === "backlog" ? "todo" : status
}

export function optionOf<T extends string>(options: Option<T>[], value: T) {
  return options.find((o) => o.value === value) ?? options[0]
}
