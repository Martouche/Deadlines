import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { safeNextPath } from "@/lib/safe-redirect"
import { createClient } from "@/lib/supabase/server"

/**
 * Cible des liens envoyés par e-mail (Magic Link, invitation).
 * Gère les deux formats Supabase :
 *  - ?token_hash=…&type=…  (templates personnalisés, recommandé)
 *  - ?code=…               (templates par défaut, flux PKCE)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const code = searchParams.get("code")
  const next = safeNextPath(searchParams.get("next"))

  // Lien au format implicite (#access_token=…) : le fragment n'arrive pas ici mais
  // le navigateur le conserve à travers la redirection ; /login le prend en charge.
  if (!(tokenHash && type) && !code) {
    return NextResponse.redirect(new URL("/login", origin))
  }

  const supabase = await createClient()
  const { error } = tokenHash && type
    ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    : await supabase.auth.exchangeCodeForSession(code!)

  if (error) {
    return NextResponse.redirect(new URL("/login?error=lien-invalide", origin))
  }

  // Après une invitation, on propose de définir un mot de passe.
  const destination = type === "invite" || type === "recovery" ? "/compte/mot-de-passe" : next
  return NextResponse.redirect(new URL(destination, origin))
}
