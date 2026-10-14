import { BaseLayout } from "@/components/layouts/base-layout"
import { PageHeader } from "@/components/page-header"
import { DemoBanner } from "@/components/demo-banner"
import { KpiCards } from "./components/kpi-cards"
import { RevenueChart } from "./components/revenue-chart"
import { CategoryChart } from "./components/category-chart"
import { RecentInvoices } from "./components/recent-invoices"
import { OutstandingPayments } from "./components/outstanding-payments"
import { RecentActivity } from "./components/recent-activity"
import { QuickActions } from "./components/quick-actions"
import { DateRangeSelector } from "./components/date-range-selector"
import { useMyCompany } from "@/hooks/use-company"

export default function Page() {
  const { company } = useMyCompany()

  return (
    <BaseLayout>
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        <PageHeader
          title="Dashboard"
          description={company ? `Business overview for ${company.name}` : "Business overview"}
          action={
            <div className="flex items-center gap-2">
              <DateRangeSelector />
            </div>
          }
        />
        <DemoBanner message="Dashboard KPIs, charts, and activity feed display demo data. These modules are not yet connected to the backend API." />
        <KpiCards />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <div>
            <CategoryChart />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <RecentInvoices />
          <OutstandingPayments />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentActivity />
          </div>
          <div>
            <QuickActions />
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}
