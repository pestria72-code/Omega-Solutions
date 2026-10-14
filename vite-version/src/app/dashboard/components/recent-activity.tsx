import { FileText, Banknote, User, Package, Wallet, ShoppingCart } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DEMO_ACTIVITIES } from "@/data/mock-data"
import { formatKES, formatDateTime } from "@/lib/format"
import type { ActivityItem } from "@/lib/types"

const typeIcons: Record<ActivityItem["type"], LucideIcon> = {
  invoice: FileText,
  payment: Banknote,
  customer: User,
  product: Package,
  expense: Wallet,
  order: ShoppingCart,
}

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest business events</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          {DEMO_ACTIVITIES.map((activity) => {
            const Icon = typeIcons[activity.type]
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                  <span className="text-sm">{activity.description}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDateTime(activity.timestamp)}</span>
                    <span>·</span>
                    <span>{activity.user}</span>
                    {activity.amount !== undefined && (
                      <>
                        <span>·</span>
                        <span className="font-medium tabular-nums">{formatKES(activity.amount)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
