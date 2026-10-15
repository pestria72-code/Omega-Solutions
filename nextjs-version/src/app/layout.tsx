import { cn } from "@/lib/utils"
import type { Metadata } from "next"
import "./globals.css"

import { ThemeProvider } from "@/components/theme-provider"
import { SidebarConfigProvider } from "@/contexts/sidebar-context"
import { Toaster } from "@/components/ui/toast"
import { inter } from "@/lib/fonts"

export const metadata: Metadata = {
  title: "Omega Solutions ERP",
  description: "Omega Solutions ERP brings finance, inventory, workforce, payroll, sales, and operations together in one secure workspace.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn(inter.variable, "antialiased")}>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="system" storageKey="nextjs-ui-theme">
          <SidebarConfigProvider>
            <Toaster>{children}</Toaster>
          </SidebarConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
