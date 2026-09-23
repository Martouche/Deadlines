// Accès explicite à process.env.NEXT_PUBLIC_* : Next ne les injecte
// dans le bundle navigateur que sous cette forme littérale.
function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`Variable d'environnement manquante : ${name} (voir .env.example)`)
  return value
}

export const env = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  siteUrl: required("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL),
}
