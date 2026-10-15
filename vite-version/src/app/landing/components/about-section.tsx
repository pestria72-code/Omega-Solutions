"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CardDecorator } from "@/components/ui/card-decorator"
import { Code, Palette, Layout, Crown } from "lucide-react"
import { Github } from "@/components/icons/brand-icons"

const values = [
  {
    icon: Code,
    title: "Operational Clarity",
    description:
      "Give teams a shared view of the processes and records they need to do their work.",
  },
  {
    icon: Palette,
    title: "Controlled Access",
    description:
      "Use role-based permissions to help protect sensitive business operations.",
  },
  {
    icon: Layout,
    title: "Connected Workflows",
    description:
      "Connect operational processes across departments instead of relying on disconnected tools.",
  },
  {
    icon: Crown,
    title: "Tenant Separation",
    description:
      "Keep organization data appropriately separated through tenant-aware access controls.",
  },
]

export function AboutSection() {
  return (
    <section id="about" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-4xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            About Omega Solutions
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
            One platform for connected business operations
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Omega Solutions brings finance, inventory, workforce, payroll, sales, and operations into one business management platform, with a focus on reliable workflows, clear permissions, and tenant-aware data separation.
          </p>
        </div>

        {/* Modern Values Grid with Enhanced Design */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-4 mb-12">
          {values.map((value, index) => (
            <Card key={index} className="group shadow-xs py-2">
              <CardHeader className="items-center p-8 text-center">
                <CardDecorator>
                  <value.icon className="size-6" aria-hidden />
                </CardDecorator>
                <CardTitle className="mt-6 text-balance">
                  {value.title}
                </CardTitle>
                <CardDescription className="mt-3">
                  {value.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-muted-foreground">
              Ready to bring your business workflows together?
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="cursor-pointer"
              nativeButton={false}
              render={
                <a
                  href="/login"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <Github data-icon="inline-start" />
              Open your workspace
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="cursor-pointer"
              nativeButton={false}
              render={
                <a
                  href="#features"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              Explore ERP capabilities
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
