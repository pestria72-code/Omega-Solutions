import { Cell, Label, Pie, PieChart } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { DEMO_CATEGORY_BREAKDOWN } from "@/data/mock-data"
import { formatKES } from "@/lib/format"

const chartConfig = {
  value: {
    label: "Revenue",
  },
} satisfies ChartConfig

const total = DEMO_CATEGORY_BREAKDOWN.reduce((sum, c) => sum + c.value, 0)

export function CategoryChart() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Revenue by Category</CardTitle>
        <CardDescription>Current month breakdown</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[220px]">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent nameKey="value" hideLabel />}
            />
            <Pie
              data={DEMO_CATEGORY_BREAKDOWN}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={85}
              strokeWidth={2}
            >
              {DEMO_CATEGORY_BREAKDOWN.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-base font-bold">
                          {formatKES(total)}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 18} className="fill-muted-foreground text-xs">
                          Total
                        </tspan>
                      </text>
                    )
                  }
                  return null
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          {DEMO_CATEGORY_BREAKDOWN.map((c) => (
            <div key={c.name} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: c.color }} />
                {c.name}
              </span>
              <span className="font-medium tabular-nums">{formatKES(c.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
