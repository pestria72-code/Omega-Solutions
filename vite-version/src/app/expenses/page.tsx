import { Wallet } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default function ExpensesPage() {
  return (
    <ModulePlaceholder
      title="Expenses"
      description="Record and track business expenses"
      icon={Wallet}
      tableHeaders={["Date", "Description", "Category", "Method", "Amount"]}
      tableRows={[
        ["02 Oct 2024", "Office rent - October", "Rent", "Bank Transfer", "KSh 120,000"],
        ["01 Oct 2024", "Electricity bill", "Utilities", "M-Pesa", "KSh 18,500"],
        ["30 Sep 2024", "Staff lunch", "Meals", "Cash", "KSh 3,500"],
        ["28 Sep 2024", "Fuel for delivery", "Transport", "Cash", "KSh 8,000"],
        ["25 Sep 2024", "Internet subscription", "Utilities", "Bank Transfer", "KSh 5,500"],
      ]}
    />
  )
}
