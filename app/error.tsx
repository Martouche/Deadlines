"use client"

import { ErrorPanel } from "@/components/app/error-panel"

// Erreurs des layouts eux-mêmes (ex. profil introuvable dans (portal)/layout).
export default function RootError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorPanel {...props} />
}
