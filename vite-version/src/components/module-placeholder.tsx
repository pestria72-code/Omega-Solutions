import { BaseLayout } from "@/components/layouts/base-layout"
import { PageHeader } from "@/components/page-header"
import { DemoBanner } from "@/components/demo-banner"
import { EmptyState } from "@/components/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { LucideIcon } from "lucide-react"

interface ModulePlaceholderProps {
  title: string
  description: string
  icon: LucideIcon
  tableHeaders: string[]
  tableRows: (string | number)[][]
  action?: React.ReactNode
}

export function ModulePlaceholder({
  title,
  description,
  icon: Icon,
  tableHeaders,
  tableRows,
  action,
}: ModulePlaceholderProps) {
  return (
    <BaseLayout>
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        <PageHeader
          title={title}
          description={description}
          action={action}
        />
        <DemoBanner />

        <Card>
          <CardContent className="p-4">
            {tableRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {tableHeaders.map((h, i) => (
                      <TableHead key={i} className={i === 0 ? "" : i === tableHeaders.length - 1 ? "text-right" : ""}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.map((row, ri) => (
                    <TableRow key={ri}>
                      {row.map((cell, ci) => (
                        <TableCell
                          key={ci}
                          className={ci === 0 ? "font-medium" : ci === row.length - 1 ? "text-right font-medium tabular-nums" : "text-muted-foreground"}
                        >
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={Icon}
                title={`No ${title.toLowerCase()} yet`}
                description={`This module will display ${title.toLowerCase()} once data is available.`}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
