import type { Metadata } from "next"

import { PasswordForm } from "@/components/auth/password-form"

export const metadata: Metadata = { title: "Mot de passe" }

export default function PasswordPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Définir un mot de passe</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Facultatif : tu pourras toujours te connecter avec un lien envoyé par e-mail.
      </p>
      <div className="mt-8 rounded-xl border border-white/10 bg-card p-6">
        <PasswordForm />
      </div>
    </div>
  )
}
