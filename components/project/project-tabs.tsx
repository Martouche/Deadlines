"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

export function ProjectTabs({ projectId, isAdmin }: { projectId: string; isAdmin: boolean }) {
  const pathname = usePathname()
  const base = `/projects/${projectId}`
  const tabs = [
    { href: base, label: "Tâches" },
    { href: `${base}/documents`, label: "Documents & livrables" },
    { href: `${base}/activity`, label: "Journal" },
    ...(isAdmin
      ? [
          { href: `${base}/time`, label: "Temps" },
          { href: `${base}/settings`, label: "Paramètres" },
        ]
      : []),
  ]

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto border-b border-white/10">
      {tabs.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative px-3 pt-2 pb-3 text-sm whitespace-nowrap transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {active && (
              <motion.span
                layoutId="project-tab-active"
                className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-foreground"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
