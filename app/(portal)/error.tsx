"use client"

import { ErrorPanel } from "@/components/app/error-panel"

// Erreurs des pages de l'espace connecté (le header reste affiché).
export default function PortalError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorPanel {...props} />
}
