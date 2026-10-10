"use client"

import { motion } from "motion/react"

import { springs } from "@/lib/motion-tokens"
import { cn } from "@/lib/utils"

/**
 * Avancement : remplissage en scaleX (transform, pas width). initial={false} :
 * le rendu serveur montre déjà la bonne valeur ; seuls les changements s'animent.
 */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const done = value >= 100
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.07]", className)}
    >
      <motion.div
        className={cn("h-full origin-left rounded-full", done ? "bg-success" : "bg-brand")}
        initial={false}
        animate={{ scaleX: Math.min(Math.max(value, 0), 100) / 100 }}
        transition={springs.gentle}
      />
    </div>
  )
}
