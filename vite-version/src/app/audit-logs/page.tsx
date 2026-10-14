import { ScrollText } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default function AuditLogsPage() {
  return (
    <ModulePlaceholder
      title="Audit Logs"
      description="Track system activity and changes"
      icon={ScrollText}
      tableHeaders={["Timestamp", "User", "Action", "Module", "Details"]}
      tableRows={[
        ["06 Oct 2024 15:30", "Peter Kamau", "Created", "Invoices", "INV-2024-010"],
        ["05 Oct 2024 10:15", "Grace Wanjiku", "Updated", "Payments", "PAY-2024-032"],
        ["04 Oct 2024 14:20", "Aisha Hassan", "Created", "Customers", "Nuru Wholesale"],
        ["03 Oct 2024 09:00", "Peter Kamau", "Updated", "Products", "Solar Panel 100W"],
        ["02 Oct 2024 16:45", "Grace Wanjiku", "Created", "Expenses", "Office rent - October"],
      ]}
    />
  )
}
