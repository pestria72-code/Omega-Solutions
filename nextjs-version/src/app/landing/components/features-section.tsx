"use client"

import {
  BarChart3,
  Zap,
  Users,
  ArrowRight,
  Database,
  Package,
  Crown,
  Layout,
  Palette,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Image3D } from "@/components/image-3d"

const mainFeatures = [
  {
    icon: Package,
    title: "Finance & Accounting",
    description:
      "Manage accounts, journals, payments, and financial reporting in one place.",
  },
  {
    icon: Crown,
    title: "Inventory & Warehousing",
    description:
      "Track stock movements, receipts, issues, reservations, and adjustments.",
  },
  {
    icon: Layout,
    title: "People & Payroll",
    description: "Support workforce processes and payroll workflows with controlled access.",
  },
  {
    icon: Zap,
    title: "Sales & Customer Operations",
    description: "Keep customer-facing processes and operational records connected.",
  },
]

const secondaryFeatures = [
  {
    icon: BarChart3,
    title: "Role-Based Access",
    description:
      "Give users access appropriate to their roles and responsibilities.",
  },
  {
    icon: Palette,
    title: "Auditability",
    description: "Keep important operational changes traceable.",
  },
  {
    icon: Users,
    title: "Connected Workflows",
    description: "Reduce duplicated work by connecting processes across modules.",
  },
  {
    icon: Database,
    title: "Tenant-Aware Workspace",
    description:
      "Keep each organization’s records separated through tenant-aware access controls.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            ERP Capabilities
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Everything your business needs in one connected system
          </h2>
          <p className="text-lg text-muted-foreground">
            Connect core business operations with shared data, clear permissions, and practical reporting across your organization.
          </p>
        </div>

        {/* First Feature Section */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8 xl:gap-16 mb-24">
          {/* Left Image */}
          <Image3D
            lightSrc="/feature-1-light.png"
            darkSrc="/feature-1-dark.png"
            alt="Analytics dashboard"
            direction="left"
          />
          {/* Right Content */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                Bring daily operations into one workspace
              </h3>
              <p className="text-muted-foreground text-base text-pretty">
                Use connected workflows to reduce manual handoffs and improve visibility across finance, inventory, people, and operations.
              </p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {mainFeatures.map((feature, index) => (
                <li
                  key={index}
                  className="group hover:bg-accent/5 flex items-start gap-3 p-2 rounded-lg transition-colors"
                >
                  <div className="mt-0.5 flex shrink-0 items-center justify-center">
                    <feature.icon
                      className="size-5 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-4 pe-4 pt-2">
              <Button size="lg" className="cursor-pointer">
                <a
                  href="#about"
                  className="flex items-center"
                >
                  Explore the ERP
                  <ArrowRight className="ms-2 size-4" aria-hidden="true" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="cursor-pointer">
                <a href="/sign-in">Sign in to continue</a>
              </Button>
            </div>
          </div>
        </div>

        {/* Second Feature Section - Flipped Layout */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8 xl:gap-16">
          {/* Left Content */}
          <div className="flex flex-col gap-6 order-2 lg:order-1">
            <div className="flex flex-col gap-4">
              <h3 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                Designed for controlled business operations
              </h3>
              <p className="text-muted-foreground text-base text-pretty">
                Omega Solutions is designed to bring teams into a shared operational workflow while maintaining access controls and tenant separation.
              </p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {secondaryFeatures.map((feature, index) => (
                <li
                  key={index}
                  className="group hover:bg-accent/5 flex items-start gap-3 p-2 rounded-lg transition-colors"
                >
                  <div className="mt-0.5 flex shrink-0 items-center justify-center">
                    <feature.icon
                      className="size-5 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-4 pe-4 pt-2">
              <Button size="lg" className="cursor-pointer">
                <a href="/sign-in" className="flex items-center">
                  Open your workspace
                  <ArrowRight className="ms-2 size-4" aria-hidden="true" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="cursor-pointer">
                <a
                  href="https://github.com/pestria72-code/Omega-Solutions"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Project repository
                </a>
              </Button>
            </div>
          </div>

          {/* Right Image */}
          <Image3D
            lightSrc="/feature-2-light.png"
            darkSrc="/feature-2-dark.png"
            alt="Performance dashboard"
            direction="right"
            className="order-1 lg:order-2"
          />
        </div>
      </div>
    </section>
  )
}
