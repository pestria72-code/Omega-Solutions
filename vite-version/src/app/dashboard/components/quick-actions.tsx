import { useNavigate } from "react-router-dom"
import { Plus, UserPlus, PackagePlus, Receipt, Banknote } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function QuickActions() {
  const navigate = useNavigate()

  const actions = [
    { label: "Create Invoice", icon: Receipt, path: "/invoices" },
    { label: "Add Customer", icon: UserPlus, path: "/customers" },
    { label: "Add Product", icon: PackagePlus, path: "/products" },
    { label: "Record Expense", icon: Banknote, path: "/expenses" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              className="h-auto flex-col gap-2 py-4 cursor-pointer"
              onClick={() => navigate(action.path)}
            >
              <action.icon className="size-5" />
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>
        <Button
          className="mt-3 w-full cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          <Plus className="size-4" />
          New Transaction
        </Button>
      </CardContent>
    </Card>
  )
}
