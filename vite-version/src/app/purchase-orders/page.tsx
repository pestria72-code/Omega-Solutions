import { ClipboardList } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default function PurchaseOrdersPage() {
  return (
    <ModulePlaceholder
      title="Purchase Orders"
      description="Manage purchase orders sent to suppliers"
      icon={ClipboardList}
      tableHeaders={["PO #", "Supplier", "Date", "Status", "Total"]}
      tableRows={[
        ["PO-2024-028", "Nairobi Electronics Ltd", "03 Oct 2024", "Received", "KSh 280,000"],
        ["PO-2024-027", "Stationery World Ltd", "01 Oct 2024", "Pending", "KSh 95,000"],
        ["PO-2024-026", "CleanPro Distributors", "28 Sep 2024", "Received", "KSh 42,000"],
        ["PO-2024-025", "Nairobi Electronics Ltd", "25 Sep 2024", "Cancelled", "KSh 155,000"],
        ["PO-2024-024", "Furniture Masters", "22 Sep 2024", "Pending", "KSh 320,000"],
      ]}
    />
  )
}
