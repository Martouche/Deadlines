"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"

import { springs } from "@/lib/motion-tokens"
import { cn } from "@/lib/utils"

export type NavItem = { href: string; label: string; exact?: boolean }

export function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative rounded-md px-3 py-1.5 text-sm transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="main-nav-active"
                className="absolute inset-0 rounded-md bg-foreground/[0.06]"
                transition={springs.snappy}
              />
            )}
            <span className="relative">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
