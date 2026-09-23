import Link from "next/link"
import { LogOut } from "lucide-react"

import { MainNav, type NavItem } from "@/components/app/main-nav"
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/actions/account"
import { requireUser } from "@/lib/auth"
import { displayName } from "@/lib/format"

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", exact: true },
  { href: "/admin/clients", label: "Clients" },
  { href: "/projects", label: "Projets" },
]

const CLIENT_NAV: NavItem[] = [{ href: "/projects", label: "Mes projets" }]

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser()
  const isAdmin = profile.role === "admin"

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="font-heading text-lg font-semibold tracking-tight">
            Portail
          </Link>
          <MainNav items={isAdmin ? ADMIN_NAV : CLIENT_NAV} />
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/compte/mot-de-passe"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              {displayName(profile)}
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" aria-label="Déconnexion">
                <LogOut />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  )
}
