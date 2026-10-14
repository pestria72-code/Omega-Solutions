import * as React from "react"
import { Plus, Pencil } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { PageHeader } from "@/components/page-header"
import { DemoBanner } from "@/components/demo-banner"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DEMO_COMPANY, DEMO_COMPANIES } from "@/data/mock-data"
import type { Branch, BranchStatus } from "@/lib/types"

export default function CompaniesPage() {
  const [company] = React.useState(DEMO_COMPANY)
  const [branches, setBranches] = React.useState<Branch[]>(DEMO_COMPANY.branches)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingBranch, setEditingBranch] = React.useState<Branch | null>(null)

  const [formData, setFormData] = React.useState({
    name: "",
    code: "",
    city: "",
    phone: "",
    email: "",
    status: "Active" as BranchStatus,
    manager: "",
  })
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})

  const openAddDialog = () => {
    setEditingBranch(null)
    setFormData({ name: "", code: "", city: "", phone: "", email: "", status: "Active", manager: "" })
    setFormErrors({})
    setDialogOpen(true)
  }

  const openEditDialog = (branch: Branch) => {
    setEditingBranch(branch)
    setFormData({
      name: branch.name,
      code: branch.code,
      city: branch.city,
      phone: branch.phone,
      email: branch.email,
      status: branch.status,
      manager: branch.manager,
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  const handleSubmit = () => {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = "Branch name is required"
    if (!formData.code.trim()) errors.code = "Branch code is required"
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    if (editingBranch) {
      setBranches((prev) => prev.map((b) => (b.id === editingBranch.id ? { ...b, ...formData } : b)))
    } else {
      const newBranch: Branch = { id: `br-${Date.now()}`, ...formData }
      setBranches((prev) => [...prev, newBranch])
    }
    setDialogOpen(false)
  }

  return (
    <BaseLayout>
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        <PageHeader
          title="Companies & Branches"
          description="Manage company profile and branch locations"
          action={
            <Button onClick={openAddDialog} className="cursor-pointer">
              <Plus className="size-4" />
              Add Branch
            </Button>
          }
        />
        <DemoBanner message="Company and branch data shown here is demo data. It is not yet connected to the backend API." />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Company Profile</CardTitle>
              <CardDescription>{company.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Registration Number</span>
                  <span className="text-sm font-medium">{company.registrationNumber}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">VAT Number</span>
                  <span className="text-sm font-medium">{company.vatNumber}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">{company.email}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Phone</span>
                  <span className="text-sm font-medium">{company.phone}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Address</span>
                  <span className="text-sm font-medium">{company.address}, {company.city}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Website</span>
                  <span className="text-sm font-medium">{company.website}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company Switcher</CardTitle>
              <CardDescription>Select active company</CardDescription>
            </CardHeader>
            <CardContent>
              <Select defaultValue={DEMO_COMPANIES[0].id}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEMO_COMPANIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Branches</CardTitle>
            <CardDescription>{branches.length} branch location(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="hidden sm:table-cell">City</TableHead>
                  <TableHead className="hidden md:table-cell">Manager</TableHead>
                  <TableHead className="hidden lg:table-cell">Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="font-mono text-xs">{b.code}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{b.city}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{b.manager}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{b.phone}</TableCell>
                    <TableCell><StatusBadge status={b.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="cursor-pointer"
                        onClick={() => openEditDialog(b)}
                        aria-label={`Edit ${b.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Edit Branch" : "Add Branch"}</DialogTitle>
            <DialogDescription>
              {editingBranch ? "Update branch details below." : "Enter the new branch details below."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="br-name">Branch Name *</Label>
                <Input id="br-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} aria-invalid={!!formErrors.name} />
                {formErrors.name && <span className="text-xs text-destructive">{formErrors.name}</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="br-code">Code *</Label>
                <Input id="br-code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} aria-invalid={!!formErrors.code} />
                {formErrors.code && <span className="text-xs text-destructive">{formErrors.code}</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="br-city">City</Label>
                <Input id="br-city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="br-manager">Manager</Label>
                <Input id="br-manager" value={formData.manager} onChange={(e) => setFormData({ ...formData, manager: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="br-phone">Phone</Label>
                <Input id="br-phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="br-email">Email</Label>
                <Input id="br-email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="br-status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => v && setFormData({ ...formData, status: v as BranchStatus })}>
                <SelectTrigger id="br-status" size="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button onClick={handleSubmit} className="cursor-pointer">
              {editingBranch ? "Save Changes" : "Add Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
