"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { api } from "@/lib/api-client"
import {
  Search,
  LayoutPanelLeft,
  LayoutDashboard,
  Mail,
  CheckSquare,
  MessageCircle,
  Calendar,
  Shield,
  AlertTriangle,
  Settings,
  HelpCircle,
  CreditCard,
  User,
  Bell,
  Link2,
  Palette,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"

interface SearchItem {
  title: string
  url: string
  group: string
  icon?: LucideIcon
}

type SearchResult = { id: string; title: string; type: string; url: string; subtitle?: string }

interface CommandSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const navigate = useNavigate()
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [searchError, setSearchError] = React.useState("")

  React.useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults([])
      setSearchError("")
      return
    }
    let cancelled = false
    const timeout = window.setTimeout(async () => {
      try {
        const found = await api.get<SearchResult[]>(`/search?q=${encodeURIComponent(term)}`)
        if (!cancelled) {
          setResults(Array.isArray(found) ? found : [])
          setSearchError("")
        }
      } catch (error) {
        if (!cancelled) {
          setResults([])
          setSearchError(error instanceof Error ? error.message : (error as { message?: string })?.message ?? "Search is unavailable.")
        }
      }
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [query])

  const searchItems: SearchItem[] = [
    // Dashboards
    {
      title: "Dashboard 1",
      url: "/dashboard",
      group: "Dashboards",
      icon: LayoutDashboard,
    },
    {
      title: "Dashboard 2",
      url: "/dashboard-2",
      group: "Dashboards",
      icon: LayoutPanelLeft,
    },

    // Apps
    { title: "Mail", url: "/mail", group: "Apps", icon: Mail },
    { title: "Tasks", url: "/tasks", group: "Apps", icon: CheckSquare },
    { title: "Chat", url: "/chat", group: "Apps", icon: MessageCircle },
    { title: "Calendar", url: "/calendar", group: "Apps", icon: Calendar },

    // Auth Pages
    {
      title: "Sign In 1",
      url: "/auth/sign-in",
      group: "Auth Pages",
      icon: Shield,
    },
    {
      title: "Sign In 2",
      url: "/auth/sign-in-2",
      group: "Auth Pages",
      icon: Shield,
    },
    {
      title: "Sign Up 1",
      url: "/auth/sign-up",
      group: "Auth Pages",
      icon: Shield,
    },
    {
      title: "Sign Up 2",
      url: "/auth/sign-up-2",
      group: "Auth Pages",
      icon: Shield,
    },
    {
      title: "Forgot Password 1",
      url: "/auth/forgot-password",
      group: "Auth Pages",
      icon: Shield,
    },
    {
      title: "Forgot Password 2",
      url: "/auth/forgot-password-2",
      group: "Auth Pages",
      icon: Shield,
    },

    // Errors
    {
      title: "Unauthorized",
      url: "/errors/unauthorized",
      group: "Errors",
      icon: AlertTriangle,
    },
    {
      title: "Forbidden",
      url: "/errors/forbidden",
      group: "Errors",
      icon: AlertTriangle,
    },
    {
      title: "Not Found",
      url: "/errors/not-found",
      group: "Errors",
      icon: AlertTriangle,
    },
    {
      title: "Internal Server Error",
      url: "/errors/internal-server-error",
      group: "Errors",
      icon: AlertTriangle,
    },
    {
      title: "Under Maintenance",
      url: "/errors/under-maintenance",
      group: "Errors",
      icon: AlertTriangle,
    },

    // Settings
    {
      title: "User Settings",
      url: "/settings/user",
      group: "Settings",
      icon: User,
    },
    {
      title: "Account Settings",
      url: "/settings/account",
      group: "Settings",
      icon: Settings,
    },
    {
      title: "Plans & Billing",
      url: "/settings/billing",
      group: "Settings",
      icon: CreditCard,
    },
    {
      title: "Appearance",
      url: "/settings/appearance",
      group: "Settings",
      icon: Palette,
    },
    {
      title: "Notifications",
      url: "/settings/notifications",
      group: "Settings",
      icon: Bell,
    },
    {
      title: "Connections",
      url: "/settings/connections",
      group: "Settings",
      icon: Link2,
    },

    // Pages
    { title: "FAQs", url: "/faqs", group: "Pages", icon: HelpCircle },
    { title: "Pricing", url: "/pricing", group: "Pages", icon: CreditCard },
  ]

  const groupedItems = searchItems.reduce(
    (acc, item) => {
      if (!acc[item.group]) {
        acc[item.group] = []
      }
      acc[item.group].push(item)
      return acc
    },
    {} as Record<string, SearchItem[]>
  )

  const handleSelect = (url: string) => {
    navigate(url)
    onOpenChange(false)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command Search"
      description="Search pages and settings"
      className="sm:max-w-[640px]"
    >
      <Command>
        <CommandInput placeholder="Search pages and company records…" autoFocus value={query} onValueChange={setQuery} />
        <CommandList className="max-h-[400px]">
          <CommandEmpty>No results found.</CommandEmpty>
          {query.trim().length >= 2 && searchError && <div className="px-3 py-2 text-sm text-destructive">{searchError}</div>}
          {results.length > 0 && (
            <CommandGroup heading="Company records">
              {results.map((item) => (
                <CommandItem key={`${item.type}:${item.id}`} value={`${item.type} ${item.title} ${item.subtitle ?? ""}`} onSelect={() => handleSelect(item.url)}>
                  <Search className="mr-2 size-4" />
                  <span className="flex min-w-0 flex-1 flex-col"><span>{item.title}</span><span className="text-xs text-muted-foreground">{item.type}{item.subtitle ? ` · ${item.subtitle}` : ""}</span></span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {Object.entries(groupedItems).map(([group, items]) => (
            <CommandGroup key={group} heading={group}>
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <CommandItem
                    key={item.url}
                    value={item.title}
                    onSelect={() => handleSelect(item.url)}
                  >
                    {Icon && <Icon />}
                    {item.title}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="relative w-full justify-start font-normal text-muted-foreground sm:pr-12 md:w-36 lg:w-56"
    >
      <Search data-icon="inline-start" />
      Search...
      <Kbd className="absolute top-1/2 right-1.5 hidden -translate-y-1/2 sm:inline-flex">
        ⌘K
      </Kbd>
    </Button>
  )
}
