import { cn } from "@/lib/utils"

/** Bloc de chargement (pulsation Tailwind intégrée, pas d'animation sur mesure). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-foreground/[0.07]", className)} />
}
