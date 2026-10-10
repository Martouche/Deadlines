// Tokens de mouvement : aucune durée ni config de ressort en dur dans les composants.
import type { Transition, Variants } from "motion/react"

export const motionTokens = {
  duration: { instant: 0.08, fast: 0.18, normal: 0.35, slow: 0.6 },
  distance: { xs: 4, sm: 8, md: 16, lg: 24 },
  scale: { subtle: 0.98, press: 0.95, pop: 1.04 },
} as const

export const springs = {
  /** Défaut UI : boutons, onglets, indicateurs de navigation. */
  snappy: { type: "spring", stiffness: 400, damping: 30 },
  /** Cartes, panneaux, contenus qui se posent. */
  gentle: { type: "spring", stiffness: 300, damping: 26 },
  /** Messages, badges, popovers : quasi immédiat. */
  instant: { type: "spring", stiffness: 600, damping: 35 },
} satisfies Record<string, Transition>

/** Sortie plus rapide que l'entrée. */
export const exitFade: Transition = { duration: motionTokens.duration.fast }

/** Liste ou grille qui apparaît : 40 ms entre deux éléments. */
export const stagger: { container: Variants; item: Variants } = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.03 } } },
  item: {
    hidden: { opacity: 0, y: motionTokens.distance.sm },
    show: { opacity: 1, y: 0, transition: springs.snappy },
  },
}
