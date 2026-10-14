import * as React from "react"
import { Plus, Search, Eye, Receipt } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { PageHeader } from "@/components/page-header"
import { DemoBanner } from "@/components/demo-banner"
import { EmptyState } from "@/components/empty-state"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { DEMO_INVOICES, DEMO_CUSTOMERS, DEMO_PRODUCTS } from "@/data/mock-data"
import { formatKES, formatDate } from "@/lib/format"
import type { Invoice } from "@/lib/types"

const statuses = ["all", "Draft", "Sent", "Paid", "Overdue", "Cancelled"]

export default function InvoicesPage() {
  const [invoices, setInvoices] = React.useState<Invoice[]>(DEMO_INVOICES)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [viewingInvoice, setViewingInvoice] = React.useState<Invoice | null>(null)

  const [newInvoice, setNewInvoice] = React.useState({
    customerId: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
  })
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalAmount = filtered.reduce((sum, inv) => sum + inv.total, 0)

  const handleCreate = () => {
    const errors: Record<string, string> = {}
    if (!newInvoice.customerId) errors.customerId = "Please select a customer"
    if (!newInvoice.dueDate) errors.dueDate = "Due date is required"
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    const customer = DEMO_CUSTOMERS.find((c) => c.id === newInvoice.customerId)
    const nextNum = invoices.length + 1
    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-2024-${String(nextNum).padStart(3, "0")}`,
      customerId: newInvoice.customerId,
      customerName: customer?.name ?? "Unknown",
      issueDate: newInvoice.issueDate,
      dueDate: newInvoice.dueDate,
      total: DEMO_PRODUCTS.slice(0, 3).reduce((s, p) => s + p.unitPrice, 0),
      status: "Draft",
      items: 3,
    }
    setInvoices((prev) => [invoice, ...prev])
    setCreateOpen(false)
    setNewInvoice({ customerId: "", issueDate: new Date().toISOString().split("T")[0], dueDate: "" })
  }

  return (
    <BaseLayout>
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        <PageHeader
          title="Invoices"
          description="Manage and track customer invoices"
          action={
            <Button onClick={() => setCreateOpen(true)} className="cursor-pointer">
              <Plus className="size-4" />
              Create Invoice
            </Button>
          }
        />
        <DemoBanner />

        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice number or customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                  aria-label="Search invoices"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
                <SelectTrigger size="sm" className="w-full sm:w-40" aria-label="Filter by status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No invoices found"
                description="Try adjusting your search or filters, or create a new invoice."
                action={<Button onClick={() => setCreateOpen(true)} variant="outline" className="cursor-pointer"><Plus className="size-4" />Create Invoice</Button>}
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="hidden sm:table-cell">Issue Date</TableHead>
                      <TableHead className="hidden md:table-cell">Due Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell className="max-w-[140px] truncate">{inv.customerName}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{formatDate(inv.issueDate)}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{formatDate(inv.dueDate)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatKES(inv.total)}</TableCell>
                        <TableCell><StatusBadge status={inv.status} /></TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="cursor-pointer"
                            onClick={() => setViewingInvoice(inv)}
                            aria-label={`View ${inv.invoiceNumber}`}
                          >
                            <Eye className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
                  <span>{filtered.length} invoice(s)</span>
                  <span className="font-medium text-foreground tabular-nums">Total: {formatKES(totalAmount)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>Select a customer and dates for the new invoice.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-customer">Customer *</Label>
              <Select value={newInvoice.customerId} onValueChange={(v) => v && setNewInvoice({ ...newInvoice, customerId: v })}>
                <SelectTrigger id="inv-customer" size="sm"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {DEMO_CUSTOMERS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.customerId && <span className="text-xs text-destructive">{formErrors.customerId}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inv-issue">Issue Date</Label>
                <Input id="inv-issue" type="date" value={newInvoice.issueDate} onChange={(e) => setNewInvoice({ ...newInvoice, issueDate: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inv-due">Due Date *</Label>
                <Input id="inv-due" type="date" value={newInvoice.dueDate} onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })} aria-invalid={!!formErrors.dueDate} />
                {formErrors.dueDate && <span className="text-xs text-destructive">{formErrors.dueDate}</span>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button onClick={handleCreate} className="cursor-pointer">Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingInvoice} onOpenChange={(open) => !open && setViewingInvoice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {viewingInvoice && (
            <div className="flex flex-col gap-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Invoice #:</span> <span className="font-medium">{viewingInvoice.invoiceNumber}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewingInvoice.status} /></div>
                <div><span className="text-muted-foreground">Customer:</span> {viewingInvoice.customerName}</div>
                <div><span className="text-muted-foreground">Items:</span> {viewingInvoice.items}</div>
                <div><span className="text-muted-foreground">Issue Date:</span> {formatDate(viewingInvoice.issueDate)}</div>
                <div><span className="text-muted-foreground">Due Date:</span> {formatDate(viewingInvoice.dueDate)}</div>
                <div className="col-span-2 border-t pt-2"><span className="text-muted-foreground">Total Amount:</span> <span className="text-lg font-bold tabular-nums">{formatKES(viewingInvoice.total)}</span></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Close</Button>} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
