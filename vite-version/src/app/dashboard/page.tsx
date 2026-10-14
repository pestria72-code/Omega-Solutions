import * as React from "react"
import { Building2, Database, RefreshCw, ShieldCheck } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api-client"

type DashboardSummary = {
  company: { id: string; name: string; currency: string } | null
  counts: { branches: number }
  generatedAt: string
}

export default function Page() {
  const [summary, setSummary] = React.useState<DashboardSummary | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadDashboard = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get<DashboardSummary>("/dashboard/summary")
      setSummary(result)
    } catch (cause) {
      // Do not surface raw server/SQL messages or leave stale figures on screen.
      setSummary(null)
      const status = typeof cause === "object" && cause !== null && "statusCode" in cause
        ? Number((cause as { statusCode: unknown }).statusCode)
        : undefined
      setError(status === 401
        ? "Your session has expired or you are signed out. Sign in again to load your company dashboard."
        : status === 403
          ? "Your account does not have an active company membership. Ask a company administrator for access."
          : "The dashboard could not load. Check the API connection and try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6 px-4 lg:px-6">
        <PageHeader
          title="Dashboard"
          description={summary?.company ? `Live overview for ${summary.company.name}` : "Live company overview"}
          action={
            <Button variant="outline" size="sm" onClick={() => void loadDashboard()} disabled={loading}>
              <RefreshCw className={loading ? "mr-2 size-4 animate-spin" : "mr-2 size-4"} />
              Refresh
            </Button>
          }
        />

        {error && (
          <div role="alert" className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Dashboard data unavailable</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadDashboard()} disabled={loading}>Try again</Button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>Company</CardDescription>
              <Building2 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold">{loading ? "Loading…" : summary?.company?.name ?? "Not available"}</div>
              <p className="mt-1 text-xs text-muted-foreground">{summary?.company?.currency ? `Reporting currency: ${summary.company.currency}` : "Company from your authenticated membership"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>Active branches</CardDescription>
              <Database className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">{loading ? "—" : (summary?.counts.branches ?? 0).toLocaleString()}</div>
              <p className="mt-1 text-xs text-muted-foreground">Branches available within your membership scope</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>API status</CardDescription>
              <ShieldCheck className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold">{loading ? "Checking…" : error ? "Unavailable" : summary?.company ? "Response received" : "Company unavailable"}</div>
              <p className="mt-1 text-xs text-muted-foreground">Authenticated dashboard response; this is not a direct database health check.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company overview</CardTitle>
            <CardDescription>Verified company details and active branch count. Financial totals and activity metrics are omitted until the corresponding ERP modules and schema are implemented.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground" role="status">Loading company data…</p>
            ) : error ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sign in or restore API access to view current company data.</p>
            ) : !summary?.company ? (
              <div className="py-8 text-center">
                <Database className="mx-auto mb-3 size-8 text-muted-foreground" />
                <p className="font-medium">Company unavailable</p>
                <p className="mt-1 text-sm text-muted-foreground">Your membership may be inactive, or the company may have been deactivated.</p>
              </div>
            ) : (
              <div className="rounded-lg border p-4">
                <p className="font-medium">{summary.company.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">Reporting currency: {summary.company.currency}</p>
                <p className="mt-3 text-xs text-muted-foreground">Last updated: {new Date(summary.generatedAt).toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
