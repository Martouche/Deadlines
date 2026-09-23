import type { Metadata } from "next"

import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"
import { safeNextPath } from "@/lib/safe-redirect"

export const metadata: Metadata = { title: "Connexion" }

const ERRORS: Record<string, string> = {
  "lien-invalide": "Ce lien de connexion a expiré ou a déjà été utilisé. Demandes-en un nouveau.",
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams
  const nextPath = safeNextPath(typeof next === "string" ? next : undefined)
  const errorMessage = typeof error === "string" ? ERRORS[error] : undefined

  return (
    <AuthShell title="Connexion" subtitle="Accède au suivi de ton projet, aux livrables et aux échanges.">
      <LoginForm next={nextPath} initialError={errorMessage} />
    </AuthShell>
  )
}
