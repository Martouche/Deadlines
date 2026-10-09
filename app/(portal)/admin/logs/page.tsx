import type { Metadata } from "next"
import { ScrollText } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { LogFilters } from "@/components/logs/log-filters"
import { read } from "@/lib/data"
import { displayName, formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Logs" }

type LogRow = {
  id: number
  created_at: string
  level: "info" | "warn" | "error"
  action: string
  ref: string
  duration_ms: number | null
  context: Record<string, unknown>
  error: string | null
  user: { full_name: string | null; email: string } | null
}

const LEVEL_STYLES = {
  info: { dot: "bg-zinc-500", label: "info" },
  warn: { dot: "bg-amber-400", label: "warn" },
  error: { dot: "bg-red-400", label: "erreur" },
} as const

export default async function LogsPage({ searchParams }: PageProps<"/admin/logs">) {
  const { niveau, q } = await searchParams
  const level = typeof niveau === "string" && niveau in LEVEL_STYLES ? niveau : ""
  const search = typeof q === "string" ? q.trim() : ""

  const supabase = await createClient()
  let query = supabase
    .from("app_logs")
    .select("id, created_at, level, action, ref, duration_ms, context, error, user:profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(300)
  if (level) query = query.eq("level", level)
  // Recherche sur l'action ou la référence (caractères spéciaux de PostgREST retirés).
  const term = search.replace(/[,()*%]/g, "")
  if (term) query = query.or(`action.ilike.*${term}*,ref.eq.${term}`)

  const logs = await read("app_logs", query.returns<LogRow[]>())

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Débogage"
        title="Logs"
        description="Chaque action et chaque erreur, avec sa durée, son contexte et sa référence. Les messages d'erreur affichés dans l'app portent cette référence."
      />
      <LogFilters level={level} search={search} />

      {(logs ?? []).length === 0 ? (
        <EmptyState icon={ScrollText} title="Aucun log" description="Rien ne correspond à ces filtres." />
      ) : (
        <ul className="divide-y divide-white/10 rounded-xl border border-white/10 font-mono text-xs">
          {(logs ?? []).map((log) => (
            <li key={log.id}>
              <details className="group">
                <summary className="grid cursor-pointer list-none grid-cols-[150px_70px_1fr_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.03] md:grid-cols-[150px_70px_220px_1fr_160px_70px_80px]">
                  <span className="text-muted-foreground">{formatDate(log.created_at, "dd/MM HH:mm:ss")}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className={cn("size-1.5 rounded-full", LEVEL_STYLES[log.level].dot)} />
                    {LEVEL_STYLES[log.level].label}
                  </span>
                  <span className="truncate text-foreground">{log.action}</span>
                  <span className={cn("hidden truncate md:block", log.error ? "text-red-300" : "text-muted-foreground")}>
                    {log.error?.split("\n")[0] ?? ""}
                  </span>
                  <span className="hidden truncate text-muted-foreground md:block">
                    {log.user ? displayName(log.user) : "—"}
                  </span>
                  <span className="hidden text-right text-muted-foreground md:block">
                    {log.duration_ms != null ? `${log.duration_ms} ms` : ""}
                  </span>
                  <span className="text-right text-muted-foreground">{log.ref}</span>
                </summary>
                <div className="grid gap-3 border-t border-white/10 bg-black/30 px-4 py-3 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-muted-foreground">Contexte</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap text-zinc-300">
                      {JSON.stringify(log.context, null, 2)}
                    </pre>
                  </div>
                  {log.error && (
                    <div>
                      <p className="mb-1 text-muted-foreground">Erreur</p>
                      <pre className="overflow-x-auto whitespace-pre-wrap text-red-300">{log.error}</pre>
                    </div>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
