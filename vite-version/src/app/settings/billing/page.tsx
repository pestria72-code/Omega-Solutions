"use client"

import * as React from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PricingPlans } from "@/components/pricing-plans"
import { api } from "@/lib/api-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  modules?: Record<string, boolean>
  message?: string
}

export default function BillingSettings() {
  const [plans, setPlans] = React.useState<Plan[]>([])
  const [current, setCurrent] = React.useState<Current | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [requesting, setRequesting] = React.useState(false)
  const [requestingModule, setRequestingModule] = React.useState<string | null>(null)

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

  const handleModuleSelect = async (moduleCode: string) => {
    setRequestingModule(moduleCode)
    setError(null)
    setNotice(null)
    try {
      const result = await api.post<{ message: string }>("/subscriptions/module-requests", { moduleCode })
      setNotice(result.message)
    } catch (err) {
      setError((err as { message?: string }).message ?? "Could not submit the add-on request.")
    } finally {
      setRequestingModule(null)
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

  const allOptionalModules = [
    { code: "accounting", name: "Finance & Accounting", description: "Accounts, expenses and financial control" },
    { code: "procurement", name: "Procurement", description: "Purchase orders, supplier bills and approvals" },
    { code: "crm", name: "CRM", description: "Sales pipeline and customer follow-ups" },
    { code: "manufacturing", name: "Manufacturing", description: "Production orders, bills of materials and costing" },
    { code: "hr_workforce", name: "HR & Workforce", description: "Employees, attendance and payroll workflows" },
  ]
  const addOnModules = current?.subscription
    ? allOptionalModules.filter((module) => current.modules?.[module.code] !== true)
    : []

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
                mode="billing"
                currentPlanId={current?.subscription?.planCode}
                onPlanSelect={handlePlanSelect}
              />
            )}
            {requesting && <p className="mt-4 text-sm text-muted-foreground">Submitting your request…</p>}
            <p className="mt-4 text-sm text-muted-foreground">Plan changes require billing confirmation. Payment-provider fees, custom integrations and hands-on implementation may be priced separately.</p>
          </CardContent>
        </Card>
        {current?.subscription && addOnModules.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Optional modules</CardTitle>
              <CardDescription>Request an add-on for your current plan. Requests are reviewed before activation; no charge or access change happens automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {addOnModules.map((module) => (
                <div key={module.code} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{module.name}</p>
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={requestingModule !== null}
                    onClick={() => handleModuleSelect(module.code)}
                  >
                    {requestingModule === module.code ? <Loader2 className="mr-2 size-4 animate-spin" /> : <PlusCircle className="mr-2 size-4" />}
                    Request module
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </BaseLayout>
  )
}
