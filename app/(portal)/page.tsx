import { requireUser } from "@/lib/auth"

// Accueil provisoire : servira de routeur (admin → /admin, client → /projects)
// une fois ces pages construites. Pour l'instant, confirme la connexion à la base.
export default async function HomePage() {
  const profile = await requireUser()

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Connexion établie</p>
      <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight">
        Bonjour {profile.full_name ?? profile.email}
      </h1>
      <dl className="mt-8 divide-y divide-white/10 rounded-xl border border-white/10 text-sm">
        <Row label="E-mail" value={profile.email} />
        <Row label="Rôle" value={profile.role === "admin" ? "Administrateur" : "Client"} />
        <Row label="Identifiant" value={profile.id} mono />
      </dl>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : undefined}>{value}</dd>
    </div>
  )
}
