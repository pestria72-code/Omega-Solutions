import * as React from "react"
import type { CustomerRow } from "@/lib/api-types"
import { api } from "@/lib/api-client"

export function useCustomers() {
  const [customers, setCustomers] = React.useState<CustomerRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refetch = React.useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .get<CustomerRow[]>("/customers")
      .then(setCustomers)
      .catch((err: { message?: string }) => setError(err.message ?? "Failed to load customers"))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    refetch()
  }, [refetch])

  return { customers, loading, error, refetch }
}

export function createCustomer(data: {
  name: string
  email?: string
  phone?: string
  city?: string
  county?: string
  addressLine1?: string
  postalCode?: string
  creditLimit?: number
}) {
  return api.post<CustomerRow>("/customers", data)
}

export function updateCustomer(customerId: string, data: {
  name?: string
  email?: string
  phone?: string
  city?: string
  county?: string
  addressLine1?: string
  postalCode?: string
  creditLimit?: number
  status?: string
}) {
  return api.patch<CustomerRow>(`/customers/${customerId}`, data)
}

export function deleteCustomer(customerId: string) {
  return api.delete<{ success: boolean }>(`/customers/${customerId}`)
}
