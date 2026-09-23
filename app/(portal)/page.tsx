import { redirect } from "next/navigation"

import { requireUser } from "@/lib/auth"

export default async function HomePage() {
  const profile = await requireUser()
  redirect(profile.role === "admin" ? "/admin" : "/projects")
}
