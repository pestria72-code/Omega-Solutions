"use client"

import * as React from "react"
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  Users,
  FileText,
  ShoppingCart,
  Store,
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
  Megaphone,
  UserRound,
  Headset,
  Factory,
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
import { useMyCompany } from "@/hooks/use-company"

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Sales Dashboard", url: "/sales-dashboard", icon: ChartNoAxesCombined },
    ],
  },
  {
    label: "CRM",
    items: [
      { title: "Leads & Pipeline", url: "/crm", icon: Users },
      { title: "Campaigns", url: "/crm/campaigns", icon: Megaphone },
      { title: "Customer Segments", url: "/crm/segments", icon: UserRound },
      { title: "Support Tickets", url: "/crm/tickets", icon: Headset },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Customers", url: "/customers", icon: Users },
      { title: "Point of Sale", url: "/pos", icon: Store },
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
      { title: "Manufacturing", url: "/manufacturing", icon: Factory },
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
      { title: "Workforce", url: "/workforce", icon: ClipboardList },
      { title: "Payroll", url: "/payroll", icon: Banknote },
      { title: "Leave Management", url: "/leave-management", icon: CalendarDays },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Companies & Branches", url: "/companies", icon: Building2 },
      { title: "Users & Roles", url: "/users-roles", icon: UserCog },
      { title: "Audit Logs", url: "/audit-logs", icon: ScrollText },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { company } = useMyCompany()

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
                <span className="truncate text-xs text-muted-foreground">
                  {company ? company.name : "ERP Platform"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
