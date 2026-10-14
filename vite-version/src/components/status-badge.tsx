import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus, StockStatus, CustomerStatus, BranchStatus, UserStatus, UserRole } from "@/lib/types";

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  Active: { variant: "default", label: "Active" },
  Inactive: { variant: "secondary", label: "Inactive" },
  Blocked: { variant: "destructive", label: "Blocked" },
  Suspended: { variant: "destructive", label: "Suspended" },
  Invited: { variant: "outline", label: "Invited" },
  Draft: { variant: "secondary", label: "Draft" },
  Sent: { variant: "outline", label: "Sent" },
  Paid: { variant: "default", label: "Paid" },
  Overdue: { variant: "destructive", label: "Overdue" },
  Cancelled: { variant: "secondary", label: "Cancelled" },
  "In Stock": { variant: "default", label: "In Stock" },
  "Low Stock": { variant: "outline", label: "Low Stock" },
  "Out of Stock": { variant: "destructive", label: "Out of Stock" },
};

export function StatusBadge({ status }: { status: InvoiceStatus | StockStatus | CustomerStatus | BranchStatus | UserStatus }) {
  const config = statusConfig[status] ?? { variant: "secondary" as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

const roleConfig: Record<UserRole, { variant: "default" | "secondary" | "outline"; label: string }> = {
  Owner: { variant: "default", label: "Owner" },
  Admin: { variant: "default", label: "Admin" },
  Manager: { variant: "secondary", label: "Manager" },
  Staff: { variant: "outline", label: "Staff" },
  Viewer: { variant: "outline", label: "Viewer" },
};

export function RoleBadge({ role }: { role: UserRole }) {
  const config = roleConfig[role] ?? { variant: "outline" as const, label: role };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
