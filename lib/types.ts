// Miroir des types SQL (supabase/migrations). À remplacer par les types générés
// (`npx supabase gen types typescript --linked > types/database.ts`) si besoin.

export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done"
export type TaskPriority = "low" | "medium" | "high" | "urgent"
export type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "archived"
export type FinancialStatus = "quote_sent" | "deposit_paid" | "in_delivery" | "balance_due" | "balance_paid"
export type ProjectHealth = "on_track" | "at_risk" | "off_track"
export type DocumentKind = "file" | "invoice" | "spec" | "access" | "figma" | "staging" | "link"

export type Client = {
  id: string
  name: string
  company: string | null
  email: string
  phone: string | null
  notes: string | null
  created_at: string
}

export type ProjectOverview = {
  id: string
  client_id: string
  title: string
  description: string | null
  status: ProjectStatus
  financial_status: FinancialStatus
  budget_cents: number | null
  currency: string
  start_date: string | null
  deadline: string | null
  updated_at: string
  client_name: string | null
  client_company: string | null
  tasks_total: number
  tasks_done: number
  progress: number
  next_deadline: string | null
  overdue_tasks: number
  awaiting_validation: number
  health: ProjectHealth
}

export type Label = { id: string; name: string; color: string }

export type TaskCardData = {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  deadline: string | null
  position: number
  client_validated_at: string | null
  label_ids: string[]
  comment_count: number
  checklist_total: number
  checklist_done: number
}

export type ChecklistItem = { id: string; title: string; is_done: boolean; position: number }

export type Comment = {
  id: string
  body: string
  created_at: string
  author_id: string
  author: { full_name: string | null; email: string; role: "admin" | "client" } | null
}

export type TaskDetail = {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  deadline: string | null
  client_validated_at: string | null
  label_ids: string[]
  checklist: ChecklistItem[]
  comments: Comment[]
}

export type ProjectDocument = {
  id: string
  kind: DocumentKind
  title: string
  description: string | null
  storage_path: string | null
  url: string | null
  mime_type: string | null
  size_bytes: number | null
  visible_to_client: boolean
  created_at: string
}

export type ActivityLog = {
  id: number
  action: string
  meta: Record<string, string | null>
  created_at: string
  visible_to_client: boolean
  actor: { full_name: string | null; email: string } | null
}

export type TimeEntry = {
  id: string
  task_id: string | null
  started_at: string
  ended_at: string | null
  minutes: number | null
  note: string | null
  billable: boolean
  task: { title: string } | null
}

export type ActionResult = { error?: string }
