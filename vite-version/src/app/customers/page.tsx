import * as React from "react"
import { Plus, Search, Pencil, Eye, Users } from "lucide-react"
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
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { DEMO_CUSTOMERS } from "@/data/mock-data"
import { formatKES, formatDate } from "@/lib/format"
import type { Customer, CustomerStatus } from "@/lib/types"

export default function CustomersPage() {
  const [customers, setCustomers] = React.useState<Customer[]>(DEMO_CUSTOMERS)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null)
  const [viewingCustomer, setViewingCustomer] = React.useState<Customer | null>( null)

  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    status: "Active" as CustomerStatus,
  })
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    const matchesStatus = statusFilter === "all" || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const openAddDialog = () => {
    setEditingCustomer(null)
    setFormData({ name: "", email: "", phone: "", city: "", status: "Active" })
    setFormErrors({})
    setDialogOpen(true)
  }

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      city: customer.city,
      status: customer.status,
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  const validate = () => {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = "Customer name is required"
    if (!formData.email.trim()) errors.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Invalid email format"
    if (!formData.phone.trim()) errors.phone = "Phone number is required"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    if (editingCustomer) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === editingCustomer.id ? { ...c, ...formData } : c))
      )
    } else {
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        ...formData,
        outstandingBalance: 0,
        totalOrders: 0,
        createdAt: new Date().toISOString().split("T")[0],
      }
      setCustomers((prev) => [newCustomer, ...prev])
    }
    setDialogOpen(false)
  }

  return (
    <BaseLayout>
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        <PageHeader
          title="Customers"
          description="Manage your customer accounts and contact information"
          action={
            <Button onClick={openAddDialog} className="cursor-pointer">
              <Plus className="size-4" />
              Add Customer
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
                  placeholder="Search by name, email, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                  aria-label="Search customers"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
                <SelectTrigger size="sm" className="w-full sm:w-40" aria-label="Filter by status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No customers found"
                description="Try adjusting your search or filters, or add a new customer."
                action={
                  <Button onClick={openAddDialog} variant="outline" className="cursor-pointer">
                    <Plus className="size-4" />
                    Add Customer
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="hidden sm:table-cell">City</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="hidden xl:table-cell">Orders</TableHead>
                    <TableHead className="hidden xl:table-cell">Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{c.email}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{c.phone}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{c.city}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatKES(c.outstandingBalance)}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell tabular-nums">{c.totalOrders}</TableCell>
                      <TableCell className="hidden xl:table-cell text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="cursor-pointer"
                            onClick={() => setViewingCustomer(c)}
                            aria-label={`View ${c.name}`}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="cursor-pointer"
                            onClick={() => openEditDialog(c)}
                            aria-label={`Edit ${c.name}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
            <DialogDescription>
              {editingCustomer ? "Update customer details below." : "Enter the new customer's details below."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cust-name">Customer Name *</Label>
              <Input
                id="cust-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                aria-invalid={!!formErrors.name}
              />
              {formErrors.name && <span className="text-xs text-destructive">{formErrors.name}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cust-email">Email *</Label>
              <Input
                id="cust-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                aria-invalid={!!formErrors.email}
              />
              {formErrors.email && <span className="text-xs text-destructive">{formErrors.email}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cust-phone">Phone *</Label>
              <Input
                id="cust-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                aria-invalid={!!formErrors.phone}
              />
              {formErrors.phone && <span className="text-xs text-destructive">{formErrors.phone}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cust-city">City</Label>
                <Input
                  id="cust-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cust-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => v && setFormData({ ...formData, status: v as CustomerStatus })}
                >
                  <SelectTrigger id="cust-status" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button onClick={handleSubmit} className="cursor-pointer">
              {editingCustomer ? "Save Changes" : "Add Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingCustomer} onOpenChange={(open) => !open && setViewingCustomer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {viewingCustomer && (
            <div className="flex flex-col gap-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{viewingCustomer.name}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewingCustomer.status} /></div>
                <div><span className="text-muted-foreground">Email:</span> {viewingCustomer.email}</div>
                <div><span className="text-muted-foreground">Phone:</span> {viewingCustomer.phone}</div>
                <div><span className="text-muted-foreground">City:</span> {viewingCustomer.city}</div>
                <div><span className="text-muted-foreground">Joined:</span> {formatDate(viewingCustomer.createdAt)}</div>
                <div><span className="text-muted-foreground">Outstanding:</span> <span className="font-medium tabular-nums">{formatKES(viewingCustomer.outstandingBalance)}</span></div>
                <div><span className="text-muted-foreground">Total Orders:</span> <span className="font-medium tabular-nums">{viewingCustomer.totalOrders}</span></div>
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
