"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Trash2 } from "lucide-react"

import { ConfirmButton } from "@/components/app/confirm-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { purgeLogs } from "@/lib/actions/logs"
import { cn } from "@/lib/utils"

const LOG_LEVEL_FILTERS = [
  { value: "", label: "Tout" },
  { value: "error", label: "Erreurs" },
  { value: "warn", label: "Avertissements" },
  { value: "info", label: "Infos" },
] as const

export function LogFilters({ level, search }: { level: string; search: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const hrefWith = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    const qs = params.toString()
    return qs ? `/admin/logs?${qs}` : "/admin/logs"
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <nav className="inline-flex rounded-lg border border-border p-0.5" aria-label="Niveau">
          {LOG_LEVEL_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={hrefWith("niveau", f.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                level === f.value ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            router.push(hrefWith("q", String(new FormData(e.currentTarget).get("q") ?? "").trim()))
          }}
        >
          <Input
            name="q"
            defaultValue={search}
            placeholder="Action ou référence (ex. projects.update, 3f2a9c1e)"
            className="h-9 w-80"
          />
        </form>
      </div>
      <ConfirmButton
        title="Purger les anciens logs ?"
        description="Supprime définitivement les logs de plus de 30 jours."
        confirmLabel="Purger"
        onConfirm={() => purgeLogs(30)}
        trigger={
          <Button variant="ghost" size="sm">
            <Trash2 /> Purger &gt; 30 jours
          </Button>
        }
      />
    </div>
  )
}
