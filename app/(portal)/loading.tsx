import { Skeleton } from "@/components/app/skeleton"

// Chargement générique de l'espace connecté : titre + grille de cartes.
export default function PortalLoading() {
  return (
    <div className="flex flex-col gap-8" role="status" aria-label="Chargement">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
