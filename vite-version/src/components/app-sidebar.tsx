"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Users,
  FileText,
  ShoppingCart,
  Package,
  Receipt,
  Wallet,
  BookOpen,
  Building2,
  ScrollText,
  Settings,
  UserCog,
  Boxes,
  ArrowLeftRight,
  Banknote,
  ClipboardList,
  Building,
  UserCircle,
  Briefcase,
  CalendarDays,
  FileBarChart,
} from "lucide-react"
import { Link } from "react-router-dom"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { DEMO_COMPANY, DEMO_COMPANIES, DEMO_USER } from "@/data/mock-data"

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Customers", url: "/customers", icon: Users },
      { title: "Quotations", url: "/quotations", icon: FileText },
      { title: "Sales Orders", url: "/sales-orders", icon: ShoppingCart },
      { title: "Invoices", url: "/invoices", icon: Receipt },
      { title: "Payments", url: "/payments", icon: Banknote },
    ],
  },
  {
    label: "Purchasing",
    items: [
      { title: "Suppliers", url: "/suppliers", icon: Briefcase },
      { title: "Purchase Orders", url: "/purchase-orders", icon: ClipboardList },
      { title: "Supplier Bills", url: "/supplier-bills", icon: FileText },
    ],
  },
  {
    label: "Inventory",
    items: [
      { title: "Products", url: "/products", icon: Package },
      { title: "Stock Levels", url: "/stock-levels", icon: Boxes },
      { title: "Warehouses", url: "/warehouses", icon: Building },
      { title: "Stock Movements", url: "/stock-movements", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Chart of Accounts", url: "/chart-of-accounts", icon: BookOpen },
      { title: "Expenses", url: "/expenses", icon: Wallet },
      { title: "Financial Reports", url: "/financial-reports", icon: FileBarChart },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Employees", url: "/employees", icon: UserCircle },
      { title: "Payroll", url: "/payroll", icon: Banknote },
      { title: "Leave Management", url: "/leave-management", icon: CalendarDays },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Companies & Branches",
        url: "/companies",
        icon: Building2,
      },
      {
        title: "Users & Roles",
        url: "/users-roles",
        icon: UserCog,
      },
      { title: "Audit Logs", url: "/audit-logs", icon: ScrollText },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [selectedCompanyId, setSelectedCompanyId] = React.useState(DEMO_COMPANY.id)

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="text-sm font-bold">Ω</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Omega Solutions</span>
                <span className="truncate text-xs text-muted-foreground">ERP Platform</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* Company selector */}
          <SidebarMenuItem>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
              aria-label="Select company"
            >
              {DEMO_COMPANIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={DEMO_USER} />
      </SidebarFooter>
    </Sidebar>
  )
}
