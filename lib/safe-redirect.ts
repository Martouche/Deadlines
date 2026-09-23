/** N'accepte qu'un chemin interne (« /projets/… »), jamais « //evil.com » ni une URL absolue. */
export function safeNextPath(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback
  return next
}
