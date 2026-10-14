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
import { DEMO_CUSTOMERS } from "@/data/mock-data"
import { formatKES } from "@/lib/format"

export function OutstandingPayments() {
  const outstanding = DEMO_CUSTOMERS
    .filter((c) => c.outstandingBalance > 0)
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
    .slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding Payments</CardTitle>
        <CardDescription>Customers with unpaid balances</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden sm:table-cell">City</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {outstanding.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">{c.city}</TableCell>
                <TableCell className="text-right font-medium tabular-nums text-destructive">
                  {formatKES(c.outstandingBalance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
