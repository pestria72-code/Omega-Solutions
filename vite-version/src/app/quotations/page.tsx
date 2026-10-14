import { FileText } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default function QuotationsPage() {
  return (
    <ModulePlaceholder
      title="Quotations"
      description="Manage price quotations sent to customers"
      icon={FileText}
      tableHeaders={["Quotation #", "Customer", "Date", "Valid Until", "Amount"]}
      tableRows={[
        ["QUO-2024-015", "Blue Sky Logistics", "01 Oct 2024", "15 Oct 2024", "KSh 145,000"],
        ["QUO-2024-014", "Coastal Imports Ltd", "28 Sep 2024", "12 Oct 2024", "KSh 320,000"],
        ["QUO-2024-013", "Highland Traders", "25 Sep 2024", "09 Oct 2024", "KSh 87,000"],
        ["QUO-2024-012", "Maendeleo Agencies", "03 Oct 2024", "17 Oct 2024", "KSh 52,000"],
        ["QUO-2024-011", "Bahari Distributors", "02 Oct 2024", "16 Oct 2024", "KSh 178,000"],
      ]}
    />
  )
}
