import type { Metadata } from "next"
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google"

import { MotionProvider } from "@/components/app/motion-provider"
import { Toaster } from "@/components/ui/sonner"
import { getTheme } from "@/lib/theme"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"] })

export const metadata: Metadata = {
  title: { default: "Portail client", template: "%s · Portail client" },
  description: "Suivi de projet, livrables et échanges.",
  robots: { index: false, follow: false },
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Thème lu côté serveur (cookie) : la page arrive déjà dans le bon thème, sans flash.
  const theme = await getTheme()

  return (
    <html
      lang="fr"
      style={{ colorScheme: theme }}
      className={`${theme === "dark" ? "dark " : ""}${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <MotionProvider>{children}</MotionProvider>
        <Toaster theme={theme} position="bottom-right" />
      </body>
    </html>
  )
}
