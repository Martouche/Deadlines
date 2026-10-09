"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { reportClientError, signOut } from "@/lib/actions/account"

type ErrorPanelProps = { error: Error & { digest?: string }; retry: () => void }

/**
 * Écran d'erreur commun. En production, une erreur venant du serveur n'expose
 * qu'un « digest » (le détail est dans les logs serveur) ; une erreur du
 * navigateur garde son message. Dans les deux cas, on la remonte dans les logs.
 */
export function ErrorPanel({ error, retry }: ErrorPanelProps) {
  const pathname = usePathname()

  useEffect(() => {
    console.error(error)
    reportClientError({ message: error.message, digest: error.digest, path: pathname }).catch(() => {
      // Serveur injoignable : l'erreur reste au moins dans la console.
    })
  }, [error, pathname])

  const detail = error.digest && process.env.NODE_ENV !== "development" ? null : error.message

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          L&apos;erreur a été enregistrée dans les logs. Réessaie ; si elle persiste, transmets la référence ci-dessous.
        </p>
        {detail && (
          <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-muted/70 p-3 font-mono text-xs whitespace-pre-wrap text-red-700 dark:text-red-300">
            {detail}
          </pre>
        )}
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-muted-foreground">Référence serveur : {error.digest}</p>
        )}
        <div className="mt-6 flex gap-2">
          <Button onClick={retry}>
            <RotateCcw /> Réessayer
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Se déconnecter
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
