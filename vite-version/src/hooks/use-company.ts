import * as React from "react"
import type { CompanyRow, BranchRow } from "@/lib/api-types"
import { api } from "@/lib/api-client"

export function useCompany(companyId: string | null) {
  const [company, setCompany] = React.useState<CompanyRow | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!companyId) {
      setCompany(null)
      return
    }
    setLoading(true)
    setError(null)
    api
      .get<CompanyRow>(`/companies/${companyId}`)
      .then(setCompany)
      .catch((err: { message?: string }) => setError(err.message ?? "Failed to load company"))
      .finally(() => setLoading(false))
  }, [companyId])

  return { company, loading, error }
}

export function useMyCompany() {
  const [company, setCompany] = React.useState<CompanyRow | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setLoading(true)
    api
      .get<CompanyRow>("/companies/me")
      .then(setCompany)
      .catch((err: { message?: string }) => setError(err.message ?? "Failed to load company"))
      .finally(() => setLoading(false))
  }, [])

  return { company, loading, error }
}

export function useBranches(companyId: string | null) {
  const [branches, setBranches] = React.useState<BranchRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const refetch = React.useCallback(() => {
    if (!companyId) {
      setBranches([])
      return
    }
    setLoading(true)
    setError(null)
    api
      .get<BranchRow[]>(`/companies/${companyId}/branches`)
      .then(setBranches)
      .catch((err: { message?: string }) => setError(err.message ?? "Failed to load branches"))
      .finally(() => setLoading(false))
  }, [companyId])

  React.useEffect(() => {
    refetch()
  }, [refetch])

  return { branches, loading, error, refetch }
}

export function createBranch(companyId: string, data: { name: string; code?: string; city?: string; phone?: string; email?: string }) {
  return api.post<BranchRow>(`/companies/${companyId}/branches`, data)
}

export function updateBranch(companyId: string, branchId: string, data: Partial<{ name: string; code: string; city: string; phone: string; email: string; isActive: boolean }>) {
  return api.patch<BranchRow>(`/companies/${companyId}/branches/${branchId}`, data)
}
