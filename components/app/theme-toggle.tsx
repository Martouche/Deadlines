"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { Moon, Sun } from "lucide-react"

import { useAction } from "@/components/app/use-action"
import { setTheme } from "@/lib/actions/theme"
import { cn } from "@/lib/utils"

type Theme = "light" | "dark"

const OPTIONS = [
  { value: "light", label: "Thème clair", icon: Sun },
  { value: "dark", label: "Thème sombre", icon: Moon },
] as const

/** Applique le thème au document sans attendre l'aller-retour serveur. */
function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.style.setProperty("color-scheme", theme)
}

/** Bascule clair / sombre : appliquée tout de suite, puis mémorisée (cookie) côté serveur. */
export function ThemeToggle({ theme }: { theme: Theme }) {
  const [current, setCurrent] = useState<Theme>(theme)
  const { run } = useAction()

  const choose = (next: Theme) => {
    if (next === current) return
    setCurrent(next)
    applyTheme(next)
    run(() => setTheme(next))
  }

  return (
    <div role="radiogroup" aria-label="Thème" className="inline-flex rounded-lg border border-border p-0.5">
      {OPTIONS.map((o) => {
        const active = current === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => choose(o.value)}
            className={cn(
              "relative flex size-7 items-center justify-center rounded-md transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="theme-toggle-active"
                className="absolute inset-0 rounded-md bg-foreground/[0.08]"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <o.icon className="relative size-3.5" />
          </button>
        )
      })}
    </div>
  )
}
