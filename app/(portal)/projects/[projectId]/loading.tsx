import { Skeleton } from "@/components/app/skeleton"

// Changement d'onglet dans un projet : l'en-tête reste, seul le contenu charge.
export default function ProjectTabLoading() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label="Chargement">
      <Skeleton className="h-9 w-64" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex w-72 shrink-0 flex-col gap-2 rounded-xl border border-border p-2">
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 3 - (i % 2) }, (_, j) => (
              <Skeleton key={j} className="h-20" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
