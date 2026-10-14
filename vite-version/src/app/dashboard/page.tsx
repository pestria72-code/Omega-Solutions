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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DEMO_COMPANIES } from "@/data/mock-data"

export default function Page() {
  return (
    <BaseLayout>
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        <PageHeader
          title="Dashboard"
          description="Business overview for Acacia Trading Ltd"
          action={
            <div className="flex items-center gap-2">
              <DateRangeSelector />
              <Select defaultValue={DEMO_COMPANIES[0].id}>
                <SelectTrigger size="sm" className="w-40">
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                  {DEMO_COMPANIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
        <DemoBanner />
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
