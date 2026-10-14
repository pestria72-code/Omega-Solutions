import * as React from "react"
import type { ProductRow } from "@/lib/api-types"
import { api } from "@/lib/api-client"

export function useProducts() {
  const [products, setProducts] = React.useState<ProductRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refetch = React.useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .get<ProductRow[]>("/products")
      .then(setProducts)
      .catch((err: { message?: string }) => setError(err.message ?? "Failed to load products"))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    refetch()
  }, [refetch])

  return { products, loading, error, refetch }
}

export function createProduct(data: {
  sku: string
  name: string
  description?: string
  category?: string
  unit?: string
  sellingPrice: number
  costPrice?: number
  stockQuantity?: number
  reorderLevel?: number
  isService?: boolean
  isActive?: boolean
}) {
  return api.post<ProductRow>("/products", data)
}

export function updateProduct(productId: string, data: {
  sku?: string
  name?: string
  description?: string
  category?: string
  unit?: string
  sellingPrice?: number
  costPrice?: number
  stockQuantity?: number
  reorderLevel?: number
  isService?: boolean
  isActive?: boolean
}) {
  return api.patch<ProductRow>(`/products/${productId}`, data)
}

export function deleteProduct(productId: string) {
  return api.delete<{ success: boolean }>(`/products/${productId}`)
}
