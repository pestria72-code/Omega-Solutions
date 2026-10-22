import * as React from "react"
import { Link } from "react-router-dom"
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  BriefcaseBusiness,
  CircleAlert,
  Package,
  Users,
  Wallet,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { api } from "@/lib/api-client"
import { formatKES, formatNumber } from "@/lib/format"
import type { CustomerRow, ProductRow, SupplierRow } from "@/lib/api-types"
import { useMyCompany } from "@/hooks/use-company"

type ResourceState<T> = {
  data: T[]
  loading: boolean
  error: string | null
}

function useResource<T>(path: string) {
  const [state, setState] = React.useState<ResourceState<T>>({
    data: [],
    loading: true,
    error: null,
  })

  React.useEffect(() => {
    let active = true
    api
      .get<T[]>(path)
      .then((data) => {
        if (active) setState({ data: Array.isArray(data) ? data : [], loading: false, error: null })
      })
      .catch((error: { message?: string }) => {
        if (active) setState({ data: [], loading: false, error: error.message ?? "Could not load records" })
      })
    return () => {
      active = false
    }
  }, [path])

  return state
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  href,
}: {
  label: string
  value: string
  detail: string
  icon: React.ElementType
  href: string
}) {
  return (
    <Card className="group min-w-0 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="h-1 w-full bg-primary/80" aria-hidden="true" />
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2 pt-5">
        <div className="min-w-0 space-y-1">
          <CardDescription>{label}</CardDescription>
          <CardTitle className="break-words text-2xl font-semibold tabular-nums">{value}</CardTitle>
        </div>
        <div className="shrink-0 rounded-xl border border-primary/15 bg-primary/10 p-3 transition-colors group-hover:bg-primary/15">
          <Icon className="size-5 text-primary-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-sm text-muted-foreground">{detail}</p>
        <Link to={href} className={buttonVariants({ variant: "ghost", size: "sm", className: "shrink-0" })}>View <ArrowUpRight className="ml-1 size-3.5" /></Link>
      </CardContent>
    </Card>
  )
}

export default function Page() {
  const { company, loading: companyLoading } = useMyCompany()
  const customers = useResource<CustomerRow>("/customers")
  const suppliers = useResource<SupplierRow>("/suppliers")
  const products = useResource<ProductRow>("/products")

  const loading = customers.loading || suppliers.loading || products.loading
  const errors = [
    customers.error && `Customers: ${customers.error}`,
    suppliers.error && `Suppliers: ${suppliers.error}`,
    products.error && `Products: ${products.error}`,
  ].filter(Boolean) as string[]

  const activeProducts = products.data.filter((product) => product.is_active)
  const lowStock = activeProducts.filter(
    (product) => !product.is_service && product.stock_quantity <= product.reorder_level,
  )
  const inventoryCost = activeProducts.reduce(
    (total, product) => total + Number(product.cost_price || 0) * Number(product.stock_quantity || 0),
    0,
  )
  const receivables = customers.data.reduce(
    (total, customer) => total + Number(customer.outstanding_balance || 0),
    0,
  )
  const payables = suppliers.data.reduce(
    (total, supplier) => total + Number(supplier.outstanding_balance || 0),
    0,
  )

  return (
    <BaseLayout>
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-white via-white to-primary/10 p-5 shadow-sm sm:p-7 dark:from-card dark:via-card dark:to-primary/10">
          <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-foreground">
                <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                BUSINESS OVERVIEW
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Good to see you back</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {companyLoading
                  ? "Loading your business workspace…"
                  : company
                    ? `Here is the latest view of ${company.name}. Keep track of stock, balances and the work that needs attention.`
                    : "Your business at a glance. Keep track of stock, balances and the work that needs attention."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/invoices" className={buttonVariants({ className: "shadow-sm" })}><Wallet className="mr-2 size-4" />Sales invoices</Link>
              <Link to="/products" className={buttonVariants({ variant: "outline", className: "bg-background/80" })}><Package className="mr-2 size-4" />View inventory</Link>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">At a glance</h2>
            <p className="text-sm text-muted-foreground">Live figures from your current company records</p>
          </div>
          <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:inline-flex"><span className="size-2 rounded-full bg-emerald-500" />Connected workspace</span>
        </div>

        {errors.length > 0 && (
          <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="space-y-1">
              <p className="font-medium">Some dashboard data could not be loaded</p>
              {errors.map((error) => <p key={error} className="text-muted-foreground">{error}</p>)}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-48 items-center justify-center rounded-xl border">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <section aria-label="Business summary" className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Customers"
                value={formatNumber(customers.data.length)}
                detail="Customer records"
                icon={Users}
                href="/customers"
              />
              <StatCard
                label="Suppliers"
                value={formatNumber(suppliers.data.length)}
                detail="Supplier records"
                icon={BriefcaseBusiness}
                href="/suppliers"
              />
              <StatCard
                label="Active products"
                value={formatNumber(activeProducts.length)}
                detail={`${lowStock.length} at or below reorder level`}
                icon={Package}
                href="/products"
              />
              <StatCard
                label="Inventory cost value"
                value={formatKES(inventoryCost)}
                detail="Current stock × recorded cost price"
                icon={Boxes}
                href="/stock-levels"
              />
            </section>

            <section className="grid min-w-0 gap-4 lg:grid-cols-2" aria-label="Balances">
              <Card className="relative overflow-hidden border-l-4 border-l-primary">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardDescription>Customer receivables</CardDescription>
                    <CardTitle className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{formatKES(receivables)}</CardTitle>
                  </div>
                  <div className="rounded-xl bg-primary/10 p-3"><ArrowUpRight className="size-5 text-primary" aria-hidden="true" /></div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-sm text-sm text-muted-foreground">Outstanding balances recorded against customers</p>
                  <Link to="/customers" className={buttonVariants({ variant: "outline", size: "sm" })}>Review customers</Link>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden border-l-4 border-l-amber-500/70">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardDescription>Supplier payables</CardDescription>
                    <CardTitle className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{formatKES(payables)}</CardTitle>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 p-3"><ArrowDownRight className="size-5 text-amber-700 dark:text-amber-300" aria-hidden="true" /></div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-sm text-sm text-muted-foreground">Outstanding balances recorded against suppliers</p>
                  <Link to="/suppliers" className={buttonVariants({ variant: "outline", size: "sm" })}>Review suppliers</Link>
                </CardContent>
              </Card>
            </section>

            <section className="grid min-w-0 gap-4 xl:grid-cols-5">
              <Card className="min-w-0 xl:col-span-3">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2"><Package className="size-5 text-primary" />Stock requiring attention</CardTitle>
                    <CardDescription>Products at or below their configured reorder level</CardDescription>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${lowStock.length ? "bg-amber-500/10 text-amber-800 dark:text-amber-300" : "bg-primary/10 text-foreground"}`}>{lowStock.length} flagged</span>
                </CardHeader>
                <CardContent>
                  {lowStock.length === 0 ? (
                    <div className="flex min-h-24 items-center gap-3 text-sm text-muted-foreground">
                      <Package className="size-5 shrink-0" />
                      No low-stock products in the records currently available.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[28rem] text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 pr-4 font-medium">Product</th>
                            <th className="py-2 pr-4 font-medium">SKU</th>
                            <th className="py-2 pr-4 text-right font-medium">On hand</th>
                            <th className="py-2 text-right font-medium">Reorder at</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lowStock.slice(0, 8).map((product) => (
                            <tr key={product.id} className="border-b last:border-0">
                              <td className="max-w-56 truncate py-3 pr-4 font-medium">{product.name}</td>
                              <td className="py-3 pr-4 text-muted-foreground">{product.sku}</td>
                              <td className="py-3 pr-4 text-right tabular-nums">{formatNumber(Number(product.stock_quantity))}</td>
                              <td className="py-3 text-right tabular-nums">{formatNumber(Number(product.reorder_level))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Link to="/products" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })}>Open products</Link>
                </CardContent>
              </Card>

              <Card className="min-w-0 xl:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ArrowUpRight className="size-5 text-primary" />Quick actions</CardTitle>
                  <CardDescription>Jump straight into common tasks</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <Link to="/customers" className={buttonVariants({ variant: "outline", className: "justify-start" })}><Users className="mr-2 size-4" />Manage customers</Link>
                  <Link to="/suppliers" className={buttonVariants({ variant: "outline", className: "justify-start" })}><BriefcaseBusiness className="mr-2 size-4" />Manage suppliers</Link>
                  <Link to="/products" className={buttonVariants({ variant: "outline", className: "justify-start" })}><Package className="mr-2 size-4" />Manage products</Link>
                  <Link to="/invoices" className={buttonVariants({ variant: "outline", className: "justify-start" })}><Wallet className="mr-2 size-4" />Sales invoices</Link>
                  {lowStock.length > 0 && (
                    <p className="flex items-center gap-2 text-sm text-amber-700 sm:col-span-2 xl:col-span-1">
                      <ArrowDownRight className="size-4 shrink-0" />
                      {lowStock.length} product{lowStock.length === 1 ? "" : "s"} need stock review.
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </BaseLayout>
  )
}
