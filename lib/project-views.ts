import type { ProjectOverview, ProjectStatus } from "@/lib/types"

// Vues prédéfinies de la liste des projets, pilotées par l'URL (?vue=…&client=…&tri=…).

export const PROJECT_VIEWS = [
  { value: "a-faire", label: "À faire", statuses: ["draft", "active", "on_hold"] },
  { value: "termines", label: "Terminés", statuses: ["completed"] },
  { value: "archives", label: "Archivés", statuses: ["archived"] },
  { value: "tout", label: "Tout", statuses: null },
] as const satisfies readonly { value: string; label: string; statuses: readonly ProjectStatus[] | null }[]

export const PROJECT_SORTS = [
  { value: "echeance", label: "Échéance la plus proche" },
  { value: "recent", label: "Modifiés récemment" },
] as const

export type ProjectView = (typeof PROJECT_VIEWS)[number]["value"]
export type ProjectSort = (typeof PROJECT_SORTS)[number]["value"]

export type ProjectQuery = { view: ProjectView; sort: ProjectSort; clientId: string | null }

function pick<T extends string>(allowed: readonly { value: T }[], value: unknown, fallback: T): T {
  return allowed.some((o) => o.value === value) ? (value as T) : fallback
}

export function parseProjectQuery(params: Record<string, string | string[] | undefined>): ProjectQuery {
  const view = pick(PROJECT_VIEWS, params.vue, "a-faire")
  // Par défaut : échéance pour ce qui reste à faire, plus récents pour l'historique.
  const sort = pick(PROJECT_SORTS, params.tri, view === "a-faire" ? "echeance" : "recent")
  const clientId = typeof params.client === "string" && params.client ? params.client : null
  return { view, sort, clientId }
}

export function matchesView(project: ProjectOverview, view: ProjectView) {
  const statuses: readonly ProjectStatus[] | null = PROJECT_VIEWS.find((v) => v.value === view)!.statuses
  return statuses === null || statuses.includes(project.status)
}

/** Prochaine échéance utile : tâche à venir, sinon deadline du projet. Sans date → en fin de liste. */
function dueDate(p: ProjectOverview) {
  return p.next_deadline ?? p.deadline ?? "9999-12-31"
}

export function sortProjects(projects: ProjectOverview[], sort: ProjectSort) {
  return [...projects].sort((a, b) =>
    sort === "echeance" ? dueDate(a).localeCompare(dueDate(b)) : b.updated_at.localeCompare(a.updated_at),
  )
}
