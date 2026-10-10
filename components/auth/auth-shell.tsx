type AuthShellProps = {
  title: string
  subtitle: string
  children: React.ReactNode
  toolbar?: React.ReactNode
}

export function AuthShell({ title, subtitle, children, toolbar }: AuthShellProps) {
  return (
    <main className="relative flex flex-1 items-center justify-center px-4 py-16">
      {toolbar && <div className="absolute top-4 right-4">{toolbar}</div>}
      <div className="w-full max-w-sm">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Portail client</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-8 rounded-xl border border-border bg-card p-6">{children}</div>
      </div>
    </main>
  )
}
