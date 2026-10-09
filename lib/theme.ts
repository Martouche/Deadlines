import "server-only"
import { cookies } from "next/headers"

export type Theme = "light" | "dark"

export const THEME_COOKIE = "theme"

/** Thème choisi par l'utilisateur (cookie), sombre par défaut. */
export async function getTheme(): Promise<Theme> {
  return (await cookies()).get(THEME_COOKIE)?.value === "light" ? "light" : "dark"
}
