"use client"

import { motion } from "motion/react"

import { useEntrance } from "@/components/app/use-entrance"
import { motionTokens, springs } from "@/lib/motion-tokens"

/**
 * template (et non layout) : remonté à chaque navigation, donc l'entrée se rejoue.
 * Montée légère depuis le bas, sans animation au premier chargement.
 */
export default function PortalTemplate({ children }: { children: React.ReactNode }) {
  const animate = useEntrance()
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: motionTokens.distance.sm } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.gentle}
    >
      {children}
    </motion.div>
  )
}
