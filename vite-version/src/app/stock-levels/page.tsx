import * as React from "react"
import { Link } from "react-router-dom"
import { AlertCircle, Boxes, Package, Search } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { StatusBadge } from "@/components/status-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
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
import { Card, CardContent } from "@/components/ui/card"
import { useProducts } from "@/hooks/use-products"
import { formatKES, formatNumber } from "@/lib/format"
import type { ProductRow } from "@/lib/api-types"

type StockStatus = "In Stock" | "Low Stock" | "Out of Stock"

function stockStatus(product: ProductRow): StockStatus {
  const quantity = Number(product.stock_quantity)
  const reorderLevel = Number(product.reorder_level)
  if (quantity <= 0) return "Out of Stock"
  if (quantity <= reorderLevel) return "Low Stock"
  return "In Stock"
}

export default function StockLevelsPage() {
  const { products, loading, error, refetch } = useProducts()
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")

  const inventory = products.filter((product) => product.is_active && !product.is_service)
  const filtered = inventory.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase()) ||
      (product.category ?? "").toLowerCase().includes(search.toLowerCase())
    const status = stockStatus(product)
    return matchesSearch && (statusFilter === "all" || status === statusFilter)
  })
  const lowStockCount = inventory.filter((product) => stockStatus(product) === "Low Stock").length
  const outOfStockCount = inventory.filter((product) => stockStatus(product) === "Out of Stock").length
  const totalCostValue = inventory.reduce(
    (total, product) => total + Number(product.stock_quantity || 0) * Number(product.cost_price || 0),
    0,
  )

  return (
    <BaseLayout>
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Stock Levels"
          description="Live stock quantities and reorder alerts from your product records"
          action={
            <Button onClick={() => void refetch()} variant="outline" disabled={loading}>
              Refresh
            </Button>
          }
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Inventory summary">
          <Card><CardContent className="flex items-center justify-between gap-4 pt-4">
            <div><p className="text-sm text-muted-foreground">Stocked products</p><p className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(inventory.length)}</p></div>
            <Package className="size-5 text-muted-foreground" />
          </CardContent></Card>
          <Card><CardContent className="flex items-center justify-between gap-4 pt-4">
            <div><p className="text-sm text-muted-foreground">Low stock</p><p className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(lowStockCount)}</p></div>
            <AlertCircle className="size-5 text-amber-600" />
          </CardContent></Card>
          <Card><CardContent className="flex items-center justify-between gap-4 pt-4">
            <div><p className="text-sm text-muted-foreground">Out of stock</p><p className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(outOfStockCount)}</p></div>
            <Boxes className="size-5 text-muted-foreground" />
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Recorded inventory cost value</p>
            <p className="mt-1 break-words text-2xl font-semibold tabular-nums">{formatKES(totalCostValue)}</p>
          </CardContent></Card>
        </section>

        <Card>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, SKU, or category…" className="pl-9" aria-label="Search stock" />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All stock statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stock statuses</SelectItem>
                  <SelectItem value="In Stock">In Stock</SelectItem>
                  <SelectItem value="Low Stock">Low Stock</SelectItem>
                  <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <p>{error}</p>
              </div>
            )}

            {loading ? (
              <LoadingSpinner />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Boxes}
                title={inventory.length === 0 ? "No stock records yet" : "No matching products"}
                description={inventory.length === 0 ? "Add stocked products to begin tracking inventory. Figures on this page come from saved product records." : "Try another search term or stock status filter."}
                action={inventory.length === 0 ? <Link to="/products" className={buttonVariants()}>Open products</Link> : undefined}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">On hand</TableHead>
                      <TableHead className="text-right">Reorder level</TableHead>
                      <TableHead className="text-right">Unit cost</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((product) => {
                      const status = stockStatus(product)
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="max-w-64 font-medium">{product.name}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{product.sku}</TableCell>
                          <TableCell>{product.category || "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(Number(product.stock_quantity))} {product.unit}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(Number(product.reorder_level))}</TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums">{formatKES(Number(product.cost_price))}</TableCell>
                          <TableCell><StatusBadge status={status.toLowerCase().replaceAll(" ", "_")} /></TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="flex flex-col justify-between gap-2 border-t pt-3 text-sm text-muted-foreground sm:flex-row sm:items-center">
              <span>Showing {formatNumber(filtered.length)} of {formatNumber(inventory.length)} active stocked products</span>
              <Link to="/products" className={buttonVariants({ variant: "outline", size: "sm" })}>Manage products</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
