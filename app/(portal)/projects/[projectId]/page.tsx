import { TaskDialog } from "@/components/tasks/task-dialog"
import { TasksView, type TasksViewMode } from "@/components/tasks/tasks-view"
import { getProject } from "@/lib/projects"
import { createClient } from "@/lib/supabase/server"
import type { Comment, Label, TaskCardData, TaskDetail, TaskPriority, TaskStatus } from "@/lib/types"

type TaskRow = {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  deadline: string | null
  position: number
  client_validated_at: string | null
  task_labels: { label_id: string }[]
  task_comments: { count: number }[]
  task_checklist_items: { is_done: boolean }[]
}

type TaskDetailRow = Omit<TaskDetail, "label_ids" | "checklist" | "comments"> & {
  task_labels: { label_id: string }[]
  task_checklist_items: TaskDetail["checklist"]
  task_comments: Comment[]
}

export default async function ProjectTasksPage({ params, searchParams }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params
  const { view, task: taskId } = await searchParams
  const { isAdmin, profile } = await getProject(projectId)
  const supabase = await createClient()

  const [{ data: rows }, { data: labels }, detail] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, status, priority, deadline, position, client_validated_at, task_labels(label_id), task_comments(count), task_checklist_items(is_done)",
      )
      .eq("project_id", projectId)
      .order("position")
      .returns<TaskRow[]>(),
    supabase.from("labels").select("id, name, color").order("name").returns<Label[]>(),
    typeof taskId === "string"
      ? supabase
          .from("tasks")
          .select(
            "id, project_id, title, description, status, priority, deadline, client_validated_at, task_labels(label_id), task_checklist_items(id, title, is_done, position), task_comments(id, body, created_at, author_id, author:profiles(full_name, email, role))",
          )
          .eq("id", taskId)
          .eq("project_id", projectId)
          .maybeSingle<TaskDetailRow>()
      : Promise.resolve({ data: null }),
  ])

  const tasks: TaskCardData[] = (rows ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    deadline: t.deadline,
    position: t.position,
    client_validated_at: t.client_validated_at,
    label_ids: t.task_labels.map((l) => l.label_id),
    comment_count: t.task_comments[0]?.count ?? 0,
    checklist_total: t.task_checklist_items.length,
    checklist_done: t.task_checklist_items.filter((i) => i.is_done).length,
  }))

  const d = detail.data
  const task: TaskDetail | null = d
    ? {
        id: d.id,
        project_id: d.project_id,
        title: d.title,
        description: d.description,
        status: d.status,
        priority: d.priority,
        deadline: d.deadline,
        client_validated_at: d.client_validated_at,
        label_ids: d.task_labels.map((l) => l.label_id),
        checklist: [...d.task_checklist_items].sort((a, b) => a.position - b.position),
        comments: [...d.task_comments].sort((a, b) => a.created_at.localeCompare(b.created_at)),
      }
    : null

  return (
    <>
      <TasksView
        projectId={projectId}
        tasks={tasks}
        labels={labels ?? []}
        isAdmin={isAdmin}
        view={(view === "list" ? "list" : "kanban") satisfies TasksViewMode}
      />
      {task && <TaskDialog key={task.id} task={task} labels={labels ?? []} isAdmin={isAdmin} currentUserId={profile.id} />}
    </>
  )
}
