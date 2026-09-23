import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/actions/account"
import { requireUser } from "@/lib/auth"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser()

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center justify-between border-b border-white/10 px-6">
        <span className="font-heading text-lg font-semibold tracking-tight">Portail</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{profile.full_name ?? profile.email}</span>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut /> Déconnexion
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-6 py-10">{children}</main>
    </div>
  )
}
