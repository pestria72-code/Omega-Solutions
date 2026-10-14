import * as React from "react"
import { Search, UserCog, Shield } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { PageHeader } from "@/components/page-header"
import { DemoBanner } from "@/components/demo-banner"
import { EmptyState } from "@/components/empty-state"
import { StatusBadge, RoleBadge } from "@/components/status-badge"
import { Input } from "@/components/ui/input"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DEMO_USERS } from "@/data/mock-data"
import { formatDateTime } from "@/lib/format"
import type { UserRole } from "@/lib/types"

const rolePermissions: Record<UserRole, string[]> = {
  Owner: ["All permissions"],
  Admin: ["Manage users", "Manage branches", "View all modules", "Create/edit records"],
  Manager: ["View all modules", "Create/edit records", "Approve orders"],
  Staff: ["Create/edit records", "View assigned modules"],
  Viewer: ["View records only"],
}

export default function UsersRolesPage() {
  const [search, setSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState("all")

  const filtered = DEMO_USERS.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === "all" || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <BaseLayout>
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        <PageHeader
          title="Users & Roles"
          description="Manage user accounts and role permissions"
        />
        <DemoBanner message="User and role data shown here is demo data. Permission management is presentational only — it is not enforced by the backend yet." />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="flex flex-col gap-4 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                    aria-label="Search users"
                  />
                </div>
                <Select value={roleFilter} onValueChange={(v) => v && setRoleFilter(v)}>
                  <SelectTrigger size="sm" className="w-full sm:w-36" aria-label="Filter by role">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="Owner">Owner</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filtered.length === 0 ? (
                <EmptyState icon={UserCog} title="No users found" description="Try adjusting your search or filters." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Branch</TableHead>
                      <TableHead className="hidden xl:table-cell">Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{u.email}</TableCell>
                        <TableCell><RoleBadge role={u.role} /></TableCell>
                        <TableCell><StatusBadge status={u.status} /></TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">{u.branch}</TableCell>
                        <TableCell className="hidden xl:table-cell text-muted-foreground">
                          {u.lastActive ? formatDateTime(u.lastActive) : "Never"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="size-4" /> Role Permissions</CardTitle>
              <CardDescription>Presentational view of role-based access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {(Object.keys(rolePermissions) as UserRole[]).map((role) => (
                  <div key={role} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <RoleBadge role={role} />
                      <span className="text-xs text-muted-foreground">{rolePermissions[role].length} permission(s)</span>
                    </div>
                    <div className="flex flex-col gap-1.5 pl-1">
                      {rolePermissions[role].map((perm) => (
                        <label key={perm} className="flex items-center gap-2 text-sm">
                          <Checkbox checked disabled />
                          <span className="text-muted-foreground">{perm}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </BaseLayout>
  )
}
