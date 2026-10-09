"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"

/** Recherche globale de l'en-tête. Raccourci : « / » depuis n'importe quelle page. */
export function SearchBox() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing = target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      if (e.key === "/" && !typing) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        const q = String(new FormData(e.currentTarget).get("q") ?? "").trim()
        if (q) router.push(`/recherche?q=${encodeURIComponent(q)}`)
      }}
      className="relative hidden md:block"
    >
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        name="q"
        type="search"
        // Clé : le champ se recale sur la recherche en cours quand on change de page.
        key={searchParams.get("q") ?? ""}
        defaultValue={searchParams.get("q") ?? ""}
        placeholder="Rechercher…  /"
        aria-label="Rechercher"
        className="h-8 w-56 pl-8 text-sm"
      />
    </form>
  )
}
