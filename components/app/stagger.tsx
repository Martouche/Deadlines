"use client"

import { motion } from "motion/react"

import { useEntrance } from "@/components/app/use-entrance"
import { stagger } from "@/lib/motion-tokens"

/**
 * Grille ou liste dont les éléments apparaissent en cascade. Pas d'animation au
 * premier chargement (le rendu serveur reste visible), seulement en navigation.
 */
export function StaggerGroup({ className, children }: { className?: string; children: React.ReactNode }) {
  const animate = useEntrance()
  return (
    <motion.div className={className} variants={stagger.container} initial={animate ? "hidden" : false} animate="show">
      {children}
    </motion.div>
  )
}

export function StaggerItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div className={className} variants={stagger.item}>
      {children}
    </motion.div>
  )
}
