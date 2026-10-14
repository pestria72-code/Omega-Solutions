import { TrendingDown, TrendingUp, Wallet, Receipt, Banknote, PiggyBank } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DEMO_KPIS } from "@/data/mock-data"
import { formatKES } from "@/lib/format"
import type { LucideIcon } from "lucide-react"

const iconMap: Record<string, LucideIcon> = {
  revenue: Wallet,
  invoices: Receipt,
  expenses: Banknote,
  profit: PiggyBank,
}

export function KpiCards() {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {DEMO_KPIS.map((kpi) => {
        const Icon = iconMap[kpi.icon] ?? Wallet
        const TrendIcon = kpi.trend === "up" ? TrendingUp : TrendingDown
        const isPositive = kpi.trend === "up"
        return (
          <Card key={kpi.label} className="@container/card">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" />
                {kpi.label}
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {formatKES(kpi.value)}
              </CardTitle>
              <CardAction>
                <Badge variant={isPositive ? "default" : "destructive"}>
                  <TrendIcon />
                  {kpi.change > 0 ? "+" : ""}{kpi.change}%
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 border-t-0 bg-transparent pt-0 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {isPositive ? "Trending up" : "Trending down"} this period{" "}
                <TrendIcon className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Compared to the previous month
              </div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
