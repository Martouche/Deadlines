"use client"

import { motion } from "motion/react"

type AuthShellProps = {
  title: string
  subtitle: string
  children: React.ReactNode
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="w-full max-w-sm"
      >
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Portail client</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-8 rounded-xl border border-white/10 bg-card p-6">{children}</div>
      </motion.div>
    </main>
  )
}
