import * as React from "react"
import { Activity, Building2, Database, RefreshCw, ShieldCheck } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api-client"

type DashboardSummary = {
  company: { id: string; name: string; currency: string } | null
  recordsByTable: Record<string, number>
  generatedAt: string
}

function labelForTable(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
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
      const message = typeof cause === "object" && cause !== null && "message" in cause
        ? String((cause as { message: unknown }).message)
        : "The dashboard could not load. Check your connection and try again."
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const records = Object.entries(summary?.recordsByTable ?? {})
    .filter(([name]) => !["audit_logs", "company_memberships", "companies"].includes(name))
    .sort(([a], [b]) => a.localeCompare(b))
  const totalRecords = records.reduce((total, [, count]) => total + count, 0)

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6 px-4 lg:px-6">
        <PageHeader
          title="Dashboard"
          description={summary?.company ? `Live overview for ${summary.company.name}` : "Live business overview"}
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
            <Button variant="outline" size="sm" onClick={() => void loadDashboard()}>Try again</Button>
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
              <CardDescription>Business records</CardDescription>
              <Database className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">{loading ? "—" : totalRecords.toLocaleString()}</div>
              <p className="mt-1 text-xs text-muted-foreground">Records found in company-scoped tables</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>Data connection</CardDescription>
              {error ? <Activity className="size-4 text-destructive" /> : <ShieldCheck className="size-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold">{loading ? "Checking…" : error ? "Unavailable" : "Connected"}</div>
              <p className="mt-1 text-xs text-muted-foreground">Authenticated API and company membership</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Business records</CardTitle>
            <CardDescription>Live counts returned by the API for your company. Financial totals are not shown until verified invoice and payment data sources are available.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading company data…</p>
            ) : error ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Reconnect to the API to view current records.</p>
            ) : records.length === 0 ? (
              <div className="py-8 text-center">
                <Database className="mx-auto mb-3 size-8 text-muted-foreground" />
                <p className="font-medium">No business records found yet</p>
                <p className="mt-1 text-sm text-muted-foreground">As your company starts using Omega, available records will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {records.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border p-4">
                    <span className="text-sm">{labelForTable(name)}</span>
                    <span className="text-lg font-semibold tabular-nums">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            {summary?.generatedAt && !loading && !error && (
              <p className="mt-4 text-xs text-muted-foreground">Last updated: {new Date(summary.generatedAt).toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
