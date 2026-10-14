import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import { DEMO_INVOICES } from "@/data/mock-data"
import { formatKES, formatDate } from "@/lib/format"

export function RecentInvoices() {
  const recent = DEMO_INVOICES.slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Invoices</CardTitle>
        <CardDescription>Latest invoices issued this period</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                <TableCell className="max-w-[120px] truncate">{inv.customerName}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {formatDate(inv.issueDate)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatKES(inv.total)}
                </TableCell>
                <TableCell><StatusBadge status={inv.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Link
          to="/invoices"
          className="mt-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View all invoices <ArrowRight className="size-3.5" />
        </Link>
      </CardContent>
    </Card>
  )
}
