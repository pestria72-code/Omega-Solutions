import { FileBarChart } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default function FinancialReportsPage() {
  return (
    <ModulePlaceholder
      title="Financial Reports"
      description="Generate and view financial statements"
      icon={FileBarChart}
      tableHeaders={["Report", "Period", "Generated", "Format", "Status"]}
      tableRows={[
        ["Profit & Loss Statement", "Oct 2024", "06 Oct 2024", "PDF", "Ready"],
        ["Balance Sheet", "As of Oct 2024", "06 Oct 2024", "PDF", "Ready"],
        ["Cash Flow Statement", "Oct 2024", "05 Oct 2024", "PDF", "Ready"],
        ["Trial Balance", "Oct 2024", "05 Oct 2024", "Excel", "Ready"],
        ["Aged Receivables", "Oct 2024", "04 Oct 2024", "PDF", "Ready"],
      ]}
    />
  )
}
