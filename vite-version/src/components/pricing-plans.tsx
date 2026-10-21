"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PricingPlan {
  id: string
  name: string
  description: string
  price: string
  frequency: string
  features: string[]
  popular?: boolean
  current?: boolean
}

interface PricingPlansProps {
  plans?: PricingPlan[]
  mode?: "pricing" | "billing"
  currentPlanId?: string
  onPlanSelect?: (planId: string) => void
}

const defaultPlans: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Essential sales and stock control for small businesses",
    price: "KSh 1,500",
    frequency: "/month",
    features: ["Inventory and stock tracking", "Sales, POS and invoicing", "Basic business reports", "2 users", "1 branch", "Standard online support"],
  },
  {
    id: "business",
    name: "Business",
    description: "Connected operations for growing businesses",
    price: "KSh 3,000",
    frequency: "/month",
    features: ["Everything in Starter", "Finance and accounting", "Procurement and approvals", "CRM and customer management", "5 users", "Up to 3 branches", "Priority support"],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Advanced ERP for complex operations",
    price: "KSh 6,000",
    frequency: "/month",
    features: ["Everything in Business", "Manufacturing and production", "HR and workforce management", "Advanced reports and workflows", "10 users", "Up to 5 branches", "Enhanced support"],
  },
]

export function PricingPlans({
  plans = defaultPlans,
  mode = "pricing",
  currentPlanId,
  onPlanSelect,
}: PricingPlansProps) {
  const getButtonText = (plan: PricingPlan) => {
    if (mode === "billing") {
      if (currentPlanId === plan.id) return "Current Plan"
      const currentIndex = plans.findIndex((p) => p.id === currentPlanId)
      const planIndex = plans.findIndex((p) => p.id === plan.id)
      if (currentIndex >= 0 && planIndex > currentIndex) return "Request upgrade"
      if (currentIndex >= 0 && planIndex < currentIndex) return "Request downgrade"
      return "Request plan"
    }
    return "Get Started"
  }

  const getButtonVariant = (plan: PricingPlan) => {
    if (mode === "billing" && currentPlanId === plan.id) return "outline" as const
    return plan.popular ? ("default" as const) : ("outline" as const)
  }

  const isButtonDisabled = (plan: PricingPlan) =>
    mode === "billing" && currentPlanId === plan.id

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {plans.map((tier) => (
        <Card
          key={tier.id}
          className={cn(
            "flex flex-col overflow-visible pt-0 shadow-xs [--card-spacing:--spacing(6)]",
            {
              "relative shadow-lg ring-primary": tier.popular,
              "ring-primary": currentPlanId === tier.id && mode === "billing",
            }
          )}
          aria-labelledby={`${tier.id}-title`}
        >
          {tier.popular && (
            <div className="absolute start-0 -top-3 w-full">
              <Badge className="mx-auto flex w-fit gap-1.5 rounded-full font-medium">
                <Sparkles className="size-4!" />
                {mode === "pricing" && <span>Recommended</span>}
                {currentPlanId === tier.id && mode === "billing" && <span>Current Plan</span>}
              </Badge>
            </div>
          )}
          <CardHeader className="gap-y-2 pt-8 text-center">
            <CardTitle id={`${tier.id}-title`} className="text-2xl font-semibold">{tier.name}</CardTitle>
            <p className="text-muted-foreground text-sm text-balance">{tier.description}</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-6">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-bold">{tier.price}</span>
              <span className="text-muted-foreground text-sm">{tier.frequency}</span>
            </div>
            <div className="flex flex-col gap-2">
              {tier.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <div className="bg-muted rounded-full p-1"><Check className="size-3.5" /></div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="border-t-0 bg-transparent pt-0">
            <Button
              className="w-full cursor-pointer"
              size="lg"
              variant={getButtonVariant(tier)}
              disabled={isButtonDisabled(tier)}
              onClick={() => onPlanSelect?.(tier.id)}
              aria-label={`${getButtonText(tier)} - ${tier.name} plan`}
            >
              {getButtonText(tier)}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
