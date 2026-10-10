"use client"

import { MotionConfig } from "motion/react"

/**
 * reducedMotion="user" : si le système demande de réduire les animations,
 * motion coupe toutes les transformations et ne garde que les fondus d'opacité.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
