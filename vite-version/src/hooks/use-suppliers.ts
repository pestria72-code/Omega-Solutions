import * as React from "react"
import type { SupplierRow } from "@/lib/api-types"
import { api } from "@/lib/api-client"

export function useSuppliers() {
  const [suppliers, setSuppliers] = React.useState<SupplierRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refetch = React.useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .get<SupplierRow[]>("/suppliers")
      .then(setSuppliers)
      .catch((err: { message?: string }) => setError(err.message ?? "Failed to load suppliers"))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    refetch()
  }, [refetch])

  return { suppliers, loading, error, refetch }
}

export function createSupplier(data: {
  name: string
  email?: string
  phone?: string
  city?: string
  county?: string
  addressLine1?: string
  postalCode?: string
  contactPerson?: string
  paymentTerms?: string
}) {
  return api.post<SupplierRow>("/suppliers", data)
}

export function updateSupplier(supplierId: string, data: {
  name?: string
  email?: string
  phone?: string
  city?: string
  county?: string
  addressLine1?: string
  postalCode?: string
  contactPerson?: string
  paymentTerms?: string
  status?: string
}) {
  return api.patch<SupplierRow>(`/suppliers/${supplierId}`, data)
}

export function deleteSupplier(supplierId: string) {
  return api.delete<{ success: boolean }>(`/suppliers/${supplierId}`)
}
