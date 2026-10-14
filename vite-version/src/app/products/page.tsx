import * as React from "react"
import { Plus, Search, Pencil, Package, AlertTriangle } from "lucide-react"
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
import { DEMO_PRODUCTS } from "@/data/mock-data"
import { formatKES } from "@/lib/format"
import type { Product, StockStatus } from "@/lib/types"

const categories = ["All", "Electronics", "Stationery", "Cleaning", "Furniture"]

export default function ProductsPage() {
  const [products, setProducts] = React.useState<Product[]>(DEMO_PRODUCTS)
  const [search, setSearch] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState("All")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null)

  const [formData, setFormData] = React.useState({
    sku: "",
    name: "",
    category: "Electronics",
    unitPrice: 0,
    costPrice: 0,
    stockQuantity: 0,
    reorderLevel: 0,
    unit: "pcs",
  })
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})

  const computeStockStatus = (qty: number, reorder: number): StockStatus => {
    if (qty === 0) return "Out of Stock"
    if (qty <= reorder) return "Low Stock"
    return "In Stock"
  }

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === "All" || p.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const lowStockCount = products.filter((p) => p.stockStatus !== "In Stock").length

  const openAddDialog = () => {
    setEditingProduct(null)
    setFormData({ sku: "", name: "", category: "Electronics", unitPrice: 0, costPrice: 0, stockQuantity: 0, reorderLevel: 0, unit: "pcs" })
    setFormErrors({})
    setDialogOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      sku: product.sku,
      name: product.name,
      category: product.category,
      unitPrice: product.unitPrice,
      costPrice: product.costPrice,
      stockQuantity: product.stockQuantity,
      reorderLevel: product.reorderLevel,
      unit: product.unit,
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  const validate = () => {
    const errors: Record<string, string> = {}
    if (!formData.sku.trim()) errors.sku = "SKU is required"
    if (!formData.name.trim()) errors.name = "Product name is required"
    if (formData.unitPrice <= 0) errors.unitPrice = "Price must be greater than 0"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const stockStatus = computeStockStatus(formData.stockQuantity, formData.reorderLevel)
    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? { ...p, ...formData, stockStatus } : p))
      )
    } else {
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        ...formData,
        stockStatus,
      }
      setProducts((prev) => [newProduct, ...prev])
    }
    setDialogOpen(false)
  }

  return (
    <BaseLayout>
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        <PageHeader
          title="Products"
          description="Manage your product catalog and pricing"
          action={
            <Button onClick={openAddDialog} className="cursor-pointer">
              <Plus className="size-4" />
              Add Product
            </Button>
          }
        />
        <DemoBanner />

        {lowStockCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
            <AlertTriangle className="size-4 text-warning" />
            <span>{lowStockCount} product(s) need attention — low or out of stock.</span>
          </div>
        )}

        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                  aria-label="Search products"
                />
              </div>
              <Select value={categoryFilter} onValueChange={(v) => v && setCategoryFilter(v)}>
                <SelectTrigger size="sm" className="w-full sm:w-40" aria-label="Filter by category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c === "All" ? "All categories" : c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No products found"
                description="Try adjusting your search or filters, or add a new product."
                action={<Button onClick={openAddDialog} variant="outline" className="cursor-pointer"><Plus className="size-4" />Add Product</Button>}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Stock</TableHead>
                    <TableHead>Stock Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{p.category}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatKES(p.unitPrice)}</TableCell>
                      <TableCell className="text-right tabular-nums hidden md:table-cell">
                        {p.stockQuantity} {p.unit}
                      </TableCell>
                      <TableCell><StatusBadge status={p.stockStatus} /></TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="cursor-pointer"
                          onClick={() => openEditDialog(p)}
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
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
            <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
            <DialogDescription>
              {editingProduct ? "Update product details below." : "Enter the new product's details below."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prod-sku">SKU *</Label>
              <Input id="prod-sku" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} aria-invalid={!!formErrors.sku} />
              {formErrors.sku && <span className="text-xs text-destructive">{formErrors.sku}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prod-name">Product Name *</Label>
              <Input id="prod-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} aria-invalid={!!formErrors.name} />
              {formErrors.name && <span className="text-xs text-destructive">{formErrors.name}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prod-category">Category</Label>
                <Select value={formData.category} onValueChange={(v) => v && setFormData({ ...formData, category: v })}>
                  <SelectTrigger id="prod-category" size="sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.filter((c) => c !== "All").map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prod-unit">Unit</Label>
                <Input id="prod-unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prod-price">Selling Price (KSh) *</Label>
                <Input id="prod-price" type="number" value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })} aria-invalid={!!formErrors.unitPrice} />
                {formErrors.unitPrice && <span className="text-xs text-destructive">{formErrors.unitPrice}</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prod-cost">Cost Price (KSh)</Label>
                <Input id="prod-cost" type="number" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prod-stock">Stock Quantity</Label>
                <Input id="prod-stock" type="number" value={formData.stockQuantity} onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prod-reorder">Reorder Level</Label>
                <Input id="prod-reorder" type="number" value={formData.reorderLevel} onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button onClick={handleSubmit} className="cursor-pointer">
              {editingProduct ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
