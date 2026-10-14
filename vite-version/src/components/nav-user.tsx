"use client"

import {
  CreditCard,
  EllipsisVertical,
  LogOut,
  CircleUser,
  Settings,
} from "lucide-react"
import { Link } from "react-router-dom"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

interface NavUserProps {
  user: {
    name: string
    email: string
    role: string
    company: string
  }
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar()

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground cursor-pointer"
              />
            }
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
              {initials}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="text-muted-foreground truncate text-xs">
                {user.role} · {user.company}
              </span>
            </div>
            <EllipsisVertical className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--anchor-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal text-foreground">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    {initials}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer"
                render={<Link to="/settings" />}
              >
                <Settings />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                render={<Link to="/users-roles" />}
              >
                <CircleUser />
                Users & Roles
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                render={<Link to="/audit-logs" />}
              >
                <CreditCard />
                Audit Logs
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer text-destructive">
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
