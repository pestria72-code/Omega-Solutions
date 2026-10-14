import { BookOpen } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default function ChartOfAccountsPage() {
  return (
    <ModulePlaceholder
      title="Chart of Accounts"
      description="View and manage your accounting structure"
      icon={BookOpen}
      tableHeaders={["Code", "Account Name", "Type", "Balance", "Status"]}
      tableRows={[
        ["1000", "Cash on Hand", "Asset", "KSh 450,000", "Active"],
        ["1010", "Bank Account - KCB", "Asset", "KSh 1,850,000", "Active"],
        ["1100", "Accounts Receivable", "Asset", "KSh 890,000", "Active"],
        ["1200", "Inventory", "Asset", "KSh 2,340,000", "Active"],
        ["2000", "Accounts Payable", "Liability", "KSh 430,000", "Active"],
        ["3000", "Share Capital", "Equity", "KSh 5,000,000", "Active"],
        ["4000", "Sales Revenue", "Income", "KSh 2,845,000", "Active"],
        ["5000", "Cost of Goods Sold", "Expense", "KSh 1,320,000", "Active"],
      ]}
    />
  )
}
