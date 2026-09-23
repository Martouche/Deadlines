"use client"

import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/actions/account"

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-card p-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {process.env.NODE_ENV === "development" ? error.message : "Réessaie dans un instant."}
        </p>
        <div className="mt-6 flex gap-2">
          <Button onClick={reset}>Réessayer</Button>
          <form action={signOut}>
            <Button type="submit" variant="outline">Se déconnecter</Button>
          </form>
        </div>
      </div>
    </main>
  )
}
