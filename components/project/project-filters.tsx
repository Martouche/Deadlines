"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { motion } from "motion/react"

import { NativeSelect } from "@/components/ui/native-select"
import { PROJECT_SORTS, PROJECT_VIEWS, type ProjectQuery, type ProjectView } from "@/lib/project-views"
import { cn } from "@/lib/utils"

type ProjectFiltersProps = {
  query: ProjectQuery
  counts: Record<ProjectView, number>
  clients: { id: string; label: string }[] | null
}

export function ProjectFilters({ query, counts, clients }: ProjectFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  /** URL courante avec un paramètre modifié (valeur vide = retiré). */
  const hrefWith = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    // Changer de vue réinitialise le tri, qui a un défaut propre à chaque vue.
    if (key === "vue") params.delete("tri")
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav className="inline-flex rounded-lg border border-border p-0.5" aria-label="Vues">
        {PROJECT_VIEWS.map((v) => {
          const active = query.view === v.value
          return (
            <Link
              key={v.value}
              href={hrefWith("vue", v.value === "a-faire" ? "" : v.value)}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="project-view-active"
                  className="absolute inset-0 rounded-md bg-foreground/[0.08]"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative">{v.label}</span>
              <span className="relative font-mono text-xs text-muted-foreground">{counts[v.value]}</span>
            </Link>
          )
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        {clients && (
          <NativeSelect
            aria-label="Filtrer par client"
            value={query.clientId ?? ""}
            onChange={(e) => router.push(hrefWith("client", e.target.value), { scroll: false })}
            className="w-56"
          >
            <option value="">Tous les clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        )}
        <NativeSelect
          aria-label="Trier"
          value={query.sort}
          onChange={(e) => router.push(hrefWith("tri", e.target.value), { scroll: false })}
          className="w-56"
        >
          {PROJECT_SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  )
}
