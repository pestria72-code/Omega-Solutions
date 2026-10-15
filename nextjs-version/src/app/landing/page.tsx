import type { Metadata } from "next"
import { LandingPageContent } from "./landing-page-content"

// Metadata for the landing page
export const metadata: Metadata = {
  title: "Omega Solutions - Modern Admin Dashboard Template",
  description:
    "An integrated business management platform for finance, inventory, workforce, payroll, sales, and operations.",
  keywords: [
    "ERP",
    "business management",
    "finance",
    "inventory",
    "payroll",
    "workforce management",
    "operations",
  ],
  openGraph: {
    title: "Omega Solutions - Modern Admin Dashboard Template",
    description:
      "An integrated business management platform for growing teams.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Omega Solutions - Modern Admin Dashboard Template",
    description:
      "A beautiful and comprehensive admin dashboard template built with React, Next.js, TypeScript, and shadcn/ui.",
  },
}

export default function LandingPage() {
  return <LandingPageContent />
}
