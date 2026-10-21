"use client"

import * as React from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PricingPlans } from "@/components/pricing-plans"
import { api } from "@/lib/api-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

type Plan = {
  code: string
  name: string
  description: string
  monthlyPriceKes: number
  currency: string
  limits: { users: number; branches: number }
  modules: { code: string; name: string }[]
}

type Current = {
  subscription: null | { planCode: string; planName: string; status: string; monthlyPriceKes: number }
  accessMode: string
  message?: string
}

export default function BillingSettings() {
  const [plans, setPlans] = React.useState<Plan[]>([])
  const [current, setCurrent] = React.useState<Current | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [requesting, setRequesting] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get<Plan[]>("/subscriptions/plans"),
      api.get<Current>("/subscriptions/current"),
    ]).then(([available, active]) => {
      if (cancelled) return
      setPlans(available)
      setCurrent(active)
    }).catch((err: { message?: string }) => {
      if (!cancelled) setError(err.message ?? "Could not load subscription information.")
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const handlePlanSelect = async (planCode: string) => {
    setRequesting(true)
    setError(null)
    setNotice(null)
    try {
      const result = await api.post<{ message: string }>("/subscriptions/change-requests", { planCode })
      setNotice(result.message)
    } catch (err) {
      setError((err as { message?: string }).message ?? "Could not submit the plan request.")
    } finally {
      setRequesting(false)
    }
  }

  const formattedPlans = plans.map((plan) => ({
    id: plan.code,
    name: plan.name,
    description: plan.description,
    price: `KSh ${plan.monthlyPriceKes.toLocaleString("en-KE")}`,
    frequency: "/month",
    popular: plan.code === "business",
    features: [
      ...plan.modules.map((module) => module.name),
      `${plan.limits.users} users`,
      `${plan.limits.branches} branch${plan.limits.branches === 1 ? "" : "es"}`,
    ],
  }))

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6 px-4 lg:px-6">
        <div>
          <h1 className="text-3xl font-bold">Plans & Billing</h1>
          <p className="text-muted-foreground">Choose the Omega ERP package that fits your business.</p>
        </div>

        {error && <Alert variant="destructive"><AlertTitle>Subscription information</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        {notice && <Alert><AlertTitle>Request submitted</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert>}

        <Card>
          <CardHeader>
            <CardTitle>Current subscription</CardTitle>
            <CardDescription>Your company subscription status. Selecting a plan submits a request; it does not charge you or change access automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading subscription…</div>
            ) : current?.subscription ? (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-xl font-semibold">{current.subscription.planName}</span>
                <span>KSh {current.subscription.monthlyPriceKes.toLocaleString("en-KE")}/month</span>
                <span className="text-sm text-muted-foreground">Status: {current.subscription.status.replaceAll("_", " ")}</span>
              </div>
            ) : (
              <p className="text-muted-foreground">No paid plan is recorded yet. Existing company access remains unchanged while billing is being configured.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available plans</CardTitle>
            <CardDescription>Prices are in Kenyan shillings and billed monthly.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading plans…</div>
            ) : (
              <PricingPlans
                plans={formattedPlans}
                mode="pricing"
                onPlanSelect={handlePlanSelect}
              />
            )}
            {requesting && <p className="mt-4 text-sm text-muted-foreground">Submitting your request…</p>}
            <p className="mt-4 text-sm text-muted-foreground">Plan changes require billing confirmation. Payment-provider fees, custom integrations and hands-on implementation may be priced separately.</p>
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
