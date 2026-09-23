"use client"

import { AnimatePresence, motion } from "motion/react"

import { cn } from "@/lib/utils"

type FormMessageProps = {
  tone: "error" | "success"
  message?: string
}

export function FormMessage({ tone, message }: FormMessageProps) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          role={tone === "error" ? "alert" : "status"}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            tone === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
          )}
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}
