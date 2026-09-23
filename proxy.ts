import type { NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/proxy"

export function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // Tout sauf les assets statiques et les images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
