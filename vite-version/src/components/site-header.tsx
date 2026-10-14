"use client"

import * as React from "react"
import { Bell, Check } from "lucide-react"
import { useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CommandSearch, SearchTrigger } from "@/components/command-search"
import { ModeToggle } from "@/components/mode-toggle"
import { DEMO_NOTIFICATIONS } from "@/data/mock-data"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "cn"

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/customers": "Customers",
  "/quotations": "Quotations",
  "/sales-orders": "Sales Orders",
  "/invoices": "Invoices",
  "/payments": "Payments",
  "/suppliers": "Suppliers",
  "/purchase-orders": "Purchase Orders",
  "/supplier-bills": "Supplier Bills",
  "/products": "Products",
  "/stock-levels": "Stock Levels",
  "/warehouses": "Warehouses",
  "/stock-movements": "Stock Movements",
  "/chart-of-accounts": "Chart of Accounts",
  "/expenses": "Expenses",
  "/financial-reports": "Financial Reports",
  "/employees": "Employees",
  "/payroll": "Payroll",
  "/leave-management": "Leave Management",
  "/companies": "Companies & Branches",
  "/users-roles": "Users & Roles",
  "/audit-logs": "Audit Logs",
  "/settings": "Settings",
}

function Breadcrumb() {
  const location = useLocation()
  const label = routeLabels[location.pathname] ?? "Page"
  return (
    <nav aria-label="Breadcrumb" className="hidden sm:flex items-center text-sm text-muted-foreground">
      <span>Omega Solutions</span>
      <span className="mx-1.5 text-border">/</span>
      <span className="font-medium text-foreground">{label}</span>
    </nav>
  )
}

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState(DEMO_NOTIFICATIONS)

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
        <div className="flex w-full items-center gap-1 px-4 py-3 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-vertical:self-center data-vertical:h-4"
          />
          <Breadcrumb />
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:block max-w-sm flex-1">
              <SearchTrigger onClick={() => setSearchOpen(true)} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="icon" className="relative cursor-pointer" />
                }
              >
                <Bell className="size-[1.2rem]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadCount}
                  </span>
                )}
                <span className="sr-only">Notifications</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-80 rounded-lg"
                align="end"
                sideOffset={8}
              >
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className={cn(
                      "flex flex-col items-start gap-0.5 py-2.5 cursor-default",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-sm font-medium">{n.title}</span>
                      {!n.read && <span className="size-2 rounded-full bg-primary" />}
                    </div>
                    <span className="text-xs text-muted-foreground">{n.message}</span>
                    <span className="text-xs text-muted-foreground/70">{n.time}</span>
                  </DropdownMenuItem>
                ))}
                {notifications.length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    <Check className="mx-auto mb-2 size-5" />
                    All caught up
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <ModeToggle />
          </div>
        </div>
      </header>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
